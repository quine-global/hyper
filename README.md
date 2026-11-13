<p align="center">
<a href="https://hyper.quineglobal.com/"><img alt="hyper - modern web-based terminal" height=150 src="https://github.com/user-attachments/assets/3096f20a-8116-45ce-8c5e-0f1106107484"></a>
</p>

<p>
  <a aria-label="Vercel logo" href="https://vercel.com"><img 
    src="https://img.shields.io/badge/MADE%20BY%20Vercel-000000.svg?style=for-the-badge&logo=vercel&labelColor=000000&logoWidth=20"
  /></a> <a aria-label="Quine logo" href="https://quineglobal.com"><img
     width="143" height="28" alt="forked-by-quine" src="https://github.com/user-attachments/assets/57decaa2-7d8c-4d13-ada7-ff6b964346f7"
  /></a>
</p>

<a href="https://www.irccloud.com/invite?channel=%23%23quine&amp;hostname=irc.libera.chat&amp;port=6697&amp;ssl=1" target="_blank"><img src="https://img.shields.io/badge/IRC-%23%23quine-1e72ff.svg?style=flat"  height="20"></a> [![Node CI](https://github.com/quine-global/hyper/actions/workflows/ci.yml/badge.svg?branch=canary)](https://github.com/quine-global/hyper/actions/workflows/ci.yml)

A terminal built on web technologies, forked from [Vercel's Hyper](https://hyper.is/). We care deeply about aesthetics and a modern feel. Visit [hyper.quineglobal.com](https://hyper.quineglobal.com/) to learn more.

## Install

With [Homebrew](https://brew.sh), on macOS or x86_64 Linux:

```sh
brew tap quine/tap https://git.quineglobal.com/quine-global/homebrew-tap.git
brew trust quine/tap
brew install --cask quine-hyper
```

The tap URL is required: without one, `brew tap` assumes a GitHub repo. Homebrew
refuses to load casks from a tap you haven't trusted, hence `brew trust`. On
macOS this installs `Hyper.app` and the `hyper` command, like the official
`hyper` cask, so only one of the two can be installed. Update with
`brew upgrade --cask quine-hyper`.

Tapped it from the old address (`forge.quinefoundation.com`)? Point it at the
new one:

```sh
brew tap --custom-remote quine/tap https://git.quineglobal.com/quine-global/homebrew-tap.git
```

### Debian and Ubuntu

From Quine Global's apt repo, signed with key
`06249465F4C6A0A851211266772797169CE1D647`:

```sh
sudo install -d /etc/apt/keyrings
sudo curl -fsSLo /etc/apt/keyrings/quine-packages.asc https://packages.quineglobal.com/quine-packages.asc
sudo curl -fsSLo /etc/apt/sources.list.d/hyper.sources https://packages.quineglobal.com/hyper.sources
sudo apt update && sudo apt install hyper
```

### Fedora and RHEL

```sh
sudo curl -fsSLo /etc/yum.repos.d/hyper.repo https://packages.quineglobal.com/hyper.repo
sudo dnf install hyper
```

On Fedora Atomic (Silverblue, Kinoite, Aurora…), put the same file in
`/etc/yum.repos.d/` and run `rpm-ostree install hyper`.

Updates then come with the rest of the system (`apt upgrade`, `dnf upgrade`).
For canary builds, use `hyper-canary.sources` or `hyper-canary.repo` instead.

## Development

1. Enable pnpm via Corepack (one-time): `corepack enable pnpm`
2. Install dependencies: `pnpm install`
3. Start dev build: `pnpm run dev`
4. In another terminal: `pnpm run app`
