// sparkle.node: starts Sparkle (the standard macOS updater) for app/updater.ts.
// Sparkle.framework is loaded from the app's Frameworks folder at runtime and
// used through the Objective-C runtime, so this builds without its headers;
// being Node-API, it works with any Electron. bin/embed-sparkle.js builds it.
#import <AppKit/AppKit.h>
#include <node_api.h>

// The selectors used, from SPUStandardUpdaterController and SPUUpdater.
@protocol HyperSparkle
- (instancetype)initWithStartingUpdater:(BOOL)start updaterDelegate:(id)d userDriverDelegate:(id)u;
- (void)startUpdater;
- (void)checkForUpdates:(id)sender;
- (id)updater;
- (void)setAutomaticallyChecksForUpdates:(BOOL)on;
@end

// Sparkle asks its delegate for the appcast before each check, so a channel
// change applies from the next one.
@interface HyperSparkleDelegate : NSObject
@property(copy) NSString *feedURL;
@end
@implementation HyperSparkleDelegate
- (NSString *)feedURLStringForUpdater:(id)updater { return self.feedURL; }
@end

static HyperSparkleDelegate *delegate;
static id<HyperSparkle> controller;

static napi_value fail(napi_env env, const char *message) {
  napi_throw_error(env, NULL, message);
  return NULL;
}

// The call's i-th argument (NULL if missing), as a string or a boolean.
static napi_value arg(napi_env env, napi_callback_info info, size_t i) {
  napi_value args[2] = {NULL, NULL};
  size_t argc = 2;
  napi_get_cb_info(env, info, &argc, args, NULL, NULL);
  return i < argc ? args[i] : NULL;
}
static NSString *str(napi_env env, napi_value v) {
  char buf[2048];
  size_t len;
  if (!v || napi_get_value_string_utf8(env, v, buf, sizeof buf, &len) != napi_ok) return nil;
  return [[NSString alloc] initWithBytes:buf length:len encoding:NSUTF8StringEncoding];
}
static bool flag(napi_env env, napi_value v) {
  bool b = false;
  if (v) napi_get_value_bool(env, v, &b);
  return b;
}

// start(feedURL, automaticChecks): loads Sparkle and starts it; it then checks
// daily on its own if automaticChecks is on.
static napi_value Start(napi_env env, napi_callback_info info) {
  NSString *feedURL = str(env, arg(env, info, 0));
  if (!feedURL) return fail(env, "sparkle: start(feedURL, automaticChecks)");
  if (controller) return fail(env, "sparkle: already started");
  NSString *path = [NSBundle.mainBundle.privateFrameworksPath stringByAppendingPathComponent:@"Sparkle.framework"];
  Class cls = [[NSBundle bundleWithPath:path] load] ? NSClassFromString(@"SPUStandardUpdaterController") : Nil;
  if (!cls) return fail(env, "sparkle: can't load Sparkle.framework");
  delegate = [HyperSparkleDelegate new];
  delegate.feedURL = feedURL;
  controller = [(id<HyperSparkle>)[cls alloc] initWithStartingUpdater:NO updaterDelegate:delegate userDriverDelegate:nil];
  [[controller updater] setAutomaticallyChecksForUpdates:flag(env, arg(env, info, 1))];
  [controller startUpdater];  // Sparkle alerts by itself if it can't start
  return NULL;
}

// setFeedURL(url): the appcast for the next check (the update channel).
static napi_value SetFeedURL(napi_env env, napi_callback_info info) {
  NSString *feedURL = str(env, arg(env, info, 0));
  if (!delegate || !feedURL) return fail(env, "sparkle: not started, or no URL");
  delegate.feedURL = feedURL;
  return NULL;
}

// setAutomaticChecks(on): Hyper's disableAutoUpdates.
static napi_value SetAutomaticChecks(napi_env env, napi_callback_info info) {
  if (!controller) return fail(env, "sparkle: not started");
  [[controller updater] setAutomaticallyChecksForUpdates:flag(env, arg(env, info, 0))];
  return NULL;
}

// checkForUpdates(): Sparkle's window, either way ("You're up to date!" too).
static napi_value CheckForUpdates(napi_env env, napi_callback_info info) {
  if (!controller) return fail(env, "sparkle: not started");
  [controller checkForUpdates:nil];
  return NULL;
}

NAPI_MODULE_INIT() {
  napi_property_descriptor fns[] = {
      {"start", NULL, Start, NULL, NULL, NULL, napi_default, NULL},
      {"setFeedURL", NULL, SetFeedURL, NULL, NULL, NULL, napi_default, NULL},
      {"setAutomaticChecks", NULL, SetAutomaticChecks, NULL, NULL, NULL, napi_default, NULL},
      {"checkForUpdates", NULL, CheckForUpdates, NULL, NULL, NULL, napi_default, NULL},
  };
  napi_define_properties(env, exports, 4, fns);
  return exports;
}
