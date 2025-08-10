exports.default = async function notarizing(context) {

  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== "darwin" || !process.env.APPLE_ID || !process.env.APPLE_PASSWORD) {
    return;
  }

  const { notarize } = await import('@electron/notarize');

  const appName = context.packager.appInfo.productFilename;
  return await notarize({
    appBundleId: "com.quineglobal.hyper",
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_PASSWORD
  });
};
