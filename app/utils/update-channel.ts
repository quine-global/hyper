// Which update channel Hyper follows (app/updater.ts, docs/updates.md).
// A canary build always follows canary: installing one is the opt-in, and
// `updateChannel` can't say otherwise, because the config Hyper writes on
// first run spells out the default ("stable") whether or not the user chose
// it. Canary builds that followed it found nothing: the stable channel only
// gets stable releases. A stable build follows `updateChannel`.
export const isCanaryBuild = (appVersion: string) => /-.*\bcanary\b/.test(appVersion);

export const followsCanary = (updateChannel: string | undefined, appVersion: string) =>
  updateChannel === 'canary' || isCanaryBuild(appVersion);
