// Sparkle, the standard macOS updater, for Hyper's main process: a small
// Node-API module (sparkle.node) that app/updater.ts loads on macOS. Sparkle
// shows its own "A new version is available" window and installs the update
// itself; this only starts it, tells it which appcast to read (the update
// channel), and runs a check on demand (Hyper › Check for Updates…).
//
// It doesn't link Sparkle: it loads Sparkle.framework from the app's
// Frameworks folder at runtime and talks to it through the Objective-C
// runtime, so it builds without Sparkle's headers and, being Node-API, works
// with any Electron. bin/embed-sparkle.js builds it (universal) and puts it
// and the framework into Hyper.app.

#import <AppKit/AppKit.h>
#include <node_api.h>

// The parts of Sparkle's API used here (SPUStandardUpdaterController,
// SPUUpdater), declared so the compiler knows the selectors.
@protocol HyperSparkleController
- (instancetype)initWithStartingUpdater:(BOOL)startUpdater
                        updaterDelegate:(id)updaterDelegate
                     userDriverDelegate:(id)userDriverDelegate;
- (void)startUpdater;
- (void)checkForUpdates:(id)sender;
- (id)updater;
@end

@protocol HyperSparkleUpdater
- (void)setAutomaticallyChecksForUpdates:(BOOL)automaticallyChecksForUpdates;
@end

// The updater's delegate: Sparkle asks it for the appcast before each check,
// so a channel change applies from the next one.
@interface HyperSparkleDelegate : NSObject
@property(copy) NSString *feedURL;
@end

@implementation HyperSparkleDelegate
- (NSString *)feedURLStringForUpdater:(id)updater {
  return self.feedURL;
}
@end

static HyperSparkleDelegate *delegate;
static id<HyperSparkleController> controller;

static napi_value undefined(napi_env env) {
  napi_value result;
  napi_get_undefined(env, &result);
  return result;
}

static napi_value throwError(napi_env env, const char *message) {
  napi_throw_error(env, NULL, message);
  return NULL;
}

// The call's arguments; fails (with a JS exception) unless there are `count`.
static bool getArgs(napi_env env, napi_callback_info info, size_t count, napi_value *args) {
  size_t argc = count;
  if (napi_get_cb_info(env, info, &argc, args, NULL, NULL) != napi_ok || argc < count) {
    throwError(env, "sparkle: missing arguments");
    return false;
  }
  return true;
}

static NSString *getString(napi_env env, napi_value value) {
  size_t length;
  if (napi_get_value_string_utf8(env, value, NULL, 0, &length) != napi_ok) {
    throwError(env, "sparkle: expected a string");
    return nil;
  }
  NSMutableData *buffer = [NSMutableData dataWithLength:length + 1];
  napi_get_value_string_utf8(env, value, buffer.mutableBytes, length + 1, &length);
  return [[NSString alloc] initWithBytes:buffer.bytes length:length encoding:NSUTF8StringEncoding];
}

static bool getBool(napi_env env, napi_value value, bool *result) {
  if (napi_get_value_bool(env, value, result) != napi_ok) {
    throwError(env, "sparkle: expected a boolean");
    return false;
  }
  return true;
}

// start(feedURL, automaticChecks): loads Sparkle and starts the updater,
// which then checks on its own schedule (daily) if automaticChecks is on.
static napi_value Start(napi_env env, napi_callback_info info) {
  napi_value args[2];
  bool automaticChecks;
  if (!getArgs(env, info, 2, args)) return NULL;
  NSString *feedURL = getString(env, args[0]);
  if (feedURL == nil || !getBool(env, args[1], &automaticChecks)) return NULL;
  if (controller != nil) return throwError(env, "sparkle: already started");

  NSString *path = [NSBundle.mainBundle.privateFrameworksPath stringByAppendingPathComponent:@"Sparkle.framework"];
  NSBundle *framework = [NSBundle bundleWithPath:path];
  NSError *error = nil;
  if (framework == nil || ![framework loadAndReturnError:&error]) {
    NSString *message = [NSString stringWithFormat:@"sparkle: can't load %@: %@", path,
                                                   error.localizedDescription ?: @"not found"];
    return throwError(env, message.UTF8String);
  }
  Class controllerClass = NSClassFromString(@"SPUStandardUpdaterController");
  if (controllerClass == Nil) return throwError(env, "sparkle: no SPUStandardUpdaterController");

  delegate = [HyperSparkleDelegate new];
  delegate.feedURL = feedURL;
  controller = [(id<HyperSparkleController>)[controllerClass alloc] initWithStartingUpdater:NO
                                                                          updaterDelegate:delegate
                                                                       userDriverDelegate:nil];
  [(id<HyperSparkleUpdater>)[controller updater] setAutomaticallyChecksForUpdates:automaticChecks];
  // Shows Sparkle's own alert if the updater can't start (a bad
  // Info.plist key, say).
  [controller startUpdater];
  return undefined(env);
}

// setFeedURL(url): the appcast for the next check (the update channel).
static napi_value SetFeedURL(napi_env env, napi_callback_info info) {
  napi_value args[1];
  if (!getArgs(env, info, 1, args)) return NULL;
  NSString *feedURL = getString(env, args[0]);
  if (feedURL == nil) return NULL;
  if (delegate == nil) return throwError(env, "sparkle: not started");
  delegate.feedURL = feedURL;
  return undefined(env);
}

// setAutomaticChecks(on): Hyper's disableAutoUpdates.
static napi_value SetAutomaticChecks(napi_env env, napi_callback_info info) {
  napi_value args[1];
  bool on;
  if (!getArgs(env, info, 1, args) || !getBool(env, args[0], &on)) return NULL;
  if (controller == nil) return throwError(env, "sparkle: not started");
  [(id<HyperSparkleUpdater>)[controller updater] setAutomaticallyChecksForUpdates:on];
  return undefined(env);
}

// checkForUpdates(): the user-initiated check, which shows Sparkle's window
// either way ("You're up to date!" included).
static napi_value CheckForUpdates(napi_env env, napi_callback_info info) {
  if (controller == nil) return throwError(env, "sparkle: not started");
  [controller checkForUpdates:nil];
  return undefined(env);
}

NAPI_MODULE_INIT() {
  const napi_property_descriptor functions[] = {
      {"start", NULL, Start, NULL, NULL, NULL, napi_default, NULL},
      {"setFeedURL", NULL, SetFeedURL, NULL, NULL, NULL, napi_default, NULL},
      {"setAutomaticChecks", NULL, SetAutomaticChecks, NULL, NULL, NULL, napi_default, NULL},
      {"checkForUpdates", NULL, CheckForUpdates, NULL, NULL, NULL, napi_default, NULL},
  };
  napi_define_properties(env, exports, sizeof(functions) / sizeof(functions[0]), functions);
  return exports;
}
