# iOS 27 launch failure

The supplied simulator crash report stops in UIKit's
`___UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption_block_invoke`
with `EXC_BREAKPOINT / SIGTRAP`, before React Native starts. The inspected device
IPA (1.0.0 build 13, compiled with Xcode 27.1) has no
`UIApplicationSceneManifest`. This matches the iOS 27 scene-lifecycle requirement.
There is no iPhone crash report yet, so successful physical-device launch still
needs verification.

Expo SDK 57 retains the legacy application lifecycle by default. This project
uses Expo 57.0.30 and enables the official `expo-build-properties` 57.0.22 option
`ios.enableSceneSupport: true`. It generates the scene manifest targeting
`EXExpoAppSceneDelegate`, gives AppDelegate the factory-provider conformance, and
removes AppDelegate's legacy window/startReactNative block. No handwritten native
patch, SDK upgrade, or Android build setting is needed.

References:
- https://github.com/expo/fyi/blob/main/ios-scene-lifecycle.md#staying-on-sdk-57-with-xcode-27
- https://docs.expo.dev/versions/v57.0.0/sdk/build-properties/
- https://developer.apple.com/documentation/uikit/transitioning-to-the-uikit-scene-based-life-cycle

## Local validation on Mac

Install the committed dependencies with `npm ci`. Existing generated iOS files
from `expo run:ios` must be regenerated before testing the change:

```sh
npx expo prebuild --platform ios --clean --no-install
npx expo run:ios --configuration Release
```

`--clean --platform ios` replaces only the generated ios directory. Do not use it
on a hand-maintained native project with uncommitted native customizations. This
repository uses Continuous Native Generation; keep signing credentials and Xcode
Archives outside that generated directory.

Before another TestFlight upload, verify launch and a cold deep link in the
simulator, then make a new signed IPA and test on the iPhone. EAS remote version
numbers differ from the app.json version used by a direct simulator build.
The simulator report's build number 5 is therefore expected and does not mean it
is the earlier TestFlight package.

Node regression tests exercise the installed official plugin against an SDK 57
AppDelegate template, checking both manifest creation and removal of legacy
startup, retention of bundle/link handlers, and repeat-run stability. Linux
validation cannot compile or launch the iOS app.
