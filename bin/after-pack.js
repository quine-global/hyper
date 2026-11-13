// electron-builder's afterPack: the V8 snapshots (all platforms), then
// Sparkle (macOS).
const cpSnapshot = require('./cp-snapshot');
const embedSparkle = require('./embed-sparkle');

exports.default = async (context) => {
  await cpSnapshot.default(context);
  await embedSparkle.default(context);
};
