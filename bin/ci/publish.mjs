#!/usr/bin/env node
// Publishes a release (.forgejo/workflows/publish.yml, docs/releasing.md):
//   1. publishes the draft GitHub release CI made for TAG (a pre-release never
//      becomes "Latest"),
//   2. writes the quine-hyper cask into quine-global/homebrew-tap,
//   3. signs the Mac zips and writes the Sparkle appcasts there
//      (docs/updates.md): canary only for a pre-release, canary and stable
//      otherwise.
// Needs macOS (plutil, Sparkle's sign_update).
//
// Env: TAG (v…), PRERELEASE (true/false), GH_RELEASE_TOKEN, SPARKLE_PRIVATE_KEY,
// HOMEBREW_TAP_SSH_KEY (unset: your own SSH setup), GITHUB_SERVER_URL (the
// forge holding the tap). DRY_RUN=1 leaves the release a draft and doesn't
// push the tap: try it on an already published tag.
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const fail = (message) => {
  throw new Error(message);
};
const need = (name) => process.env[name] || fail(`${name} isn't set`);

const tag = need("TAG");
const version = tag.replace(/^v/, "");
const prerelease = need("PRERELEASE") === "true";
const token = need("GH_RELEASE_TOKEN");
const sparkleKey = need("SPARKLE_PRIVATE_KEY");
const forge = new URL(need("GITHUB_SERVER_URL")).hostname;
const dryRun = Boolean(process.env.DRY_RUN);
if (process.env.GITHUB_ACTIONS) need("HOMEBREW_TAP_SSH_KEY");

const API = "https://api.github.com/repos/quine-global/hyper";
const FORGE_HOST_KEY =
  "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHECXyh0SwRlXikgu919nC9OTmAU7AEcrlbJ/J/H9DTU";

const github = async (path, options = {}) => {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok)
    fail(
      `GitHub ${options.method || "GET"} ${path}: ${res.status} ${await res.text()}`,
    );
  return res.json();
};

const run = (cmd, args, options = {}) =>
  execFileSync(cmd, args, { encoding: "utf8", ...options }).trim();

const escapeXml = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const tmp = mkdtempSync(join(process.env.RUNNER_TEMP || tmpdir(), "publish-"));
try {
  // 1. The release. Drafts aren't served by /releases/tags/, so look it up.
  const releases = await github("/releases?per_page=100");
  let release =
    releases.find((r) => r.tag_name === tag) || fail(`no release for ${tag}`);
  if (!dryRun) {
    release = await github(`/releases/${release.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        draft: false,
        prerelease,
        make_latest: String(!prerelease),
      }),
    });
  }
  const asset = (suffix) =>
    release.assets.find((a) => a.name === `Hyper-${version}-${suffix}`) ||
    fail(`${tag} has no Hyper-${version}-${suffix}`);
  const sha256 = (suffix) =>
    asset(suffix).digest?.replace(/^sha256:/, "") ||
    fail(`no digest for ${suffix}`);

  // 2. The tap, over SSH on 2200 of the forge this runs on.
  writeFileSync(
    join(tmp, "known_hosts"),
    `[${forge}]:2200 ${FORGE_HOST_KEY}\n`,
  );
  let ssh = `ssh -o UserKnownHostsFile=${join(tmp, "known_hosts")}`;
  if (process.env.HOMEBREW_TAP_SSH_KEY) {
    writeFileSync(
      join(tmp, "tap_key"),
      `${process.env.HOMEBREW_TAP_SSH_KEY.trim()}\n`,
      { mode: 0o600 },
    );
    ssh += ` -i ${join(tmp, "tap_key")} -o IdentitiesOnly=yes`;
  }
  const tap = join(tmp, "tap");
  const git = (...args) =>
    run("git", ["-C", tap, ...args], {
      env: { ...process.env, GIT_SSH_COMMAND: ssh },
    });
  run(
    "git",
    [
      "clone",
      "-q",
      `ssh://git@${forge}:2200/quine-global/homebrew-tap.git`,
      tap,
    ],
    {
      env: { ...process.env, GIT_SSH_COMMAND: ssh },
    },
  );

  const values = {
    VERSION: version,
    ARM_SHA: sha256("mac-arm64.dmg"),
    INTEL_SHA: sha256("mac-x64.dmg"),
    X86_LINUX_SHA: sha256("x86_64.AppImage"),
  };
  const cask = readFileSync("build/mac/quine-hyper.rb.in", "utf8")
    .replace(/^(#.*\n)+/, "") // the template's own header
    .replace(
      /@([A-Z0-9_]+)@/g,
      (_, key) =>
        values[key] ?? fail(`quine-hyper.rb.in: no value for @${key}@`),
    );
  writeFileSync(join(tap, "Casks/quine-hyper.rb"), cask);

  // 3. Sparkle. It compares CFBundleVersion (the CI run number on tags), and
  // only installs updates signed with SUPublicEDKey's private half.
  writeFileSync(join(tmp, "sparkle_key"), `${sparkleKey.trim()}\n`, {
    mode: 0o600,
  });
  run("build/mac/sparkle/download-sparkle.sh", [join(tmp, "sparkle")]);
  mkdirSync(join(tap, "appcasts"), { recursive: true });
  // Release notes are plain text to Sparkle's HTML view.
  const notes = escapeXml(release.body || "").replace(/\r?\n/g, "<br>\n");
  const feeds = prerelease ? ["hyper-canary"] : ["hyper-canary", "hyper"];

  for (const arch of ["arm64", "x64"]) {
    const zipAsset = asset(`mac-${arch}.zip`);
    const zip = join(tmp, zipAsset.name);
    const res = await fetch(zipAsset.browser_download_url);
    if (!res.ok) fail(`download ${zipAsset.name}: ${res.status}`);
    writeFileSync(zip, Buffer.from(await res.arrayBuffer()));

    const plist = execFileSync("unzip", [
      "-p",
      zip,
      "Hyper.app/Contents/Info.plist",
    ]);
    const build = run(
      "plutil",
      ["-extract", "CFBundleVersion", "raw", "-o", "-", "-"],
      { input: plist },
    );
    if (!/^\d+$/.test(build))
      fail(`${zipAsset.name}: CFBundleVersion ${build} isn't a CI run number`);
    const signature = run(join(tmp, "sparkle/sparkle-bin/sign_update"), [
      zip,
      "-f",
      join(tmp, "sparkle_key"),
    ]);

    for (const feed of feeds) {
      const file = join(tap, "appcasts", `${feed}-${arch}.xml`);
      // Never move a channel back to an older build (a draft published late).
      let old = "";
      try {
        old =
          readFileSync(file, "utf8").match(/<sparkle:version>(\d+)</)?.[1] ??
          "";
      } catch {}
      if (old && Number(build) < Number(old)) {
        console.log(`${feed}-${arch}.xml already has newer build ${old}`);
        continue;
      }
      writeFileSync(
        file,
        `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle"><channel><item>
<title>Hyper ${escapeXml(version)}</title>
<sparkle:version>${build}</sparkle:version>
<sparkle:shortVersionString>${escapeXml(version)}</sparkle:shortVersionString>
<pubDate>${new Date().toUTCString()}</pubDate>
<description><![CDATA[${notes}]]></description>
<enclosure url="${escapeXml(zipAsset.browser_download_url)}" type="application/octet-stream" ${signature}/>
</item></channel></rss>
`,
      );
    }
  }

  git("add", "-A");
  if (!git("status", "--porcelain")) {
    console.log("Tap unchanged");
  } else if (dryRun) {
    console.log(git("diff", "--cached", "--stat"));
    console.log(`Dry run: not pushed. The tap is in ${tap}`);
  } else {
    git(
      "-c",
      "user.name=Hyper release",
      "-c",
      "user.email=noreply@quineglobal.com",
      "commit",
      "-qm",
      `quine-hyper ${version}`,
    );
    git("push", "-q");
    console.log(`Published ${tag}`);
  }
} finally {
  // Keys never outlive the run; a dry run keeps the tap clone to look at.
  for (const f of ["tap_key", "sparkle_key"])
    rmSync(join(tmp, f), { force: true });
  if (!dryRun) rmSync(tmp, { recursive: true, force: true });
}
