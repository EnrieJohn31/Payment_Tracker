# Diagnosis: instant crash on launch + Play Protect warning

Date: 2026-07-04 · App: Payment Tracker (Expo SDK 54, RN 0.81.5, EAS `preview` APK)

## Root cause 1 — crash on launch: incompatible `@expo/ui` native module

**Failure mechanism.** Your lockfile resolved `"@expo/ui": "~0.2.0-beta.9"` to
`0.2.0-canary-20260121-a63c0dd` — a January 2026 canary built against a future SDK, not SDK 54.
npm's semver rules rank the prerelease tag `canary-…` *higher* than `beta.9` within `0.2.0-x`,
so both your local install and the EAS build silently got the canary. Its peer deps are all `"*"`,
so nothing warned.

The chain that kills the app:

1. Expo autolinking registers every installed Expo module even if your JS never imports it
   (nothing in `src/` imports `@expo/ui` — it still ships in the APK).
2. The canary ships a **prebuilt AAR** (`local-maven-repo/…/expo.modules.ui-0.2.0-canary….aar`),
   so Gradle links its bytecode without compiling its Kotlin — no build-time error is possible.
3. That bytecode references `expo.modules.kotlin.views.ExpoViewComposableScope` /
   `ComposableScope`, classes that **do not exist in expo-modules-core 3.0.30** (SDK 54's version
   — verified by searching the package sources: zero occurrences).
4. At process start, Expo's module registry class-loads `expo.modules.ui.ExpoUIModule` →
   `NoClassDefFoundError` on the main thread → the app dies before the splash screen renders.

History made this worse: the initial commit had `"@expo/ui": "~57.0.3"` — an SDK 57 package on an
SDK 54 app. The "downgrade" to `~0.2.0-beta.9` never actually took effect because of the canary.

**Fix applied:** removed `@expo/ui` from `package.json` (it was unused). If you want it later, pin
exactly `"0.2.0-beta.9"` (no `~`), or upgrade the whole app to the SDK that matches the package.

## Root cause 2 — guaranteed crash on the Add Purchase screen: missing Google Maps API key

`react-native-maps` on Android requires `com.google.android.geo.API_KEY` in the manifest. Your
`app.json` had no `android.config.googleMaps.apiKey`, so prebuild emits no key and the Maps SDK
throws `IllegalStateException: API key not found` the first time a `MapView` renders
(`location-map.tsx`, used by Add Purchase). Even after fixing crash #1, the app would die there.

**Fix applied:** added `android.config.googleMaps.apiKey` with a placeholder. To finish:

1. Google Cloud Console → create/reuse a project → enable **Maps SDK for Android**.
2. Credentials → API key → restrict to Android apps → package `com.enriejohn.paymenttracker` +
   the SHA-1 from expo.dev → your project → Credentials → Android Keystore.
3. Replace `REPLACE_WITH_YOUR_ANDROID_MAPS_API_KEY` in `app.json`.

## Root cause 3 — "dangerous app" warning: Play Protect heuristics on a sideloaded APK

This is not a defect in the APK. Any internet-sideloaded APK signed with a keystore Google has
never seen (EAS internal distribution) triggers a Play Protect warning. Yours reads as
higher-risk than average because the heuristics stack: a finance-named app ("Payment Tracker"),
`RECORD_AUDIO` + `ACCESS_FINE_LOCATION` declared, unknown developer certificate, delivered
outside Play. Mic + location + payments vocabulary is a classic spyware/fraud fingerprint, and
Google runs stricter fraud protection for financial apps in the Philippines.

`RECORD_AUDIO` was never needed — you photograph receipts, not record audio (it was both declared
explicitly and injected by `expo-image-picker` for video capture).

**Fix applied:** removed `RECORD_AUDIO` from `permissions` and added it to
`android.blockedPermissions` so no library can merge it back. This softens the warning; it cannot
remove it entirely. The only clean fix is distributing through Play (internal testing track is
enough — Play signs the app and the warning disappears).

## Rebuild steps

```
npm install            # regenerates package-lock.json without @expo/ui (required — EAS runs npm ci)
npx expo-doctor        # optional sanity check
eas build -p android --profile preview
```

Commit `package.json`, `package-lock.json`, and `app.json` before building. Going forward, add
Expo packages with `npx expo install <pkg>` so versions match your SDK.

## If it still crashes: capture the real stack in 30 seconds

Enable USB debugging, connect the phone, then:

```
adb logcat -c && adb logcat -b crash -d > crash.txt   # launch the app between the two commands
```

Expected signature for root cause 1: `java.lang.NoClassDefFoundError: … expo/modules/kotlin/views/…ComposableScope`
inside `expo.modules.…` frames. Drop `crash.txt` (or the APK itself) into this folder and I can
decode either one.

## Notes

- Full emulation wasn't possible in this sandbox (no KVM/virtualization and no npm registry
  access), so the diagnosis rests on the lockfile, the installed packages' native sources, the
  canary's AAR bytecode, and Expo's SDK 54 docs — each verified directly.
- `expo-glass-effect` is Apple-only (`platforms: ["apple"]`) — irrelevant to Android; left as-is.
- `expo-symbols`/`collapsible.tsx` are unused but harmless.
