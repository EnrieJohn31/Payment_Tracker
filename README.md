# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

## Map setup

The purchase screen uses `@maplibre/maplibre-react-native` so a purchase can be pinned where it was
bought without Google Maps billing. The default style is OpenFreeMap's MapLibre style:

```bash
https://tiles.openfreemap.org/styles/liberty
```

For production, you can keep OpenFreeMap, self-host tiles, or use a MapLibre-compatible provider.
To switch styles without editing code, set this build-time environment variable before building:

```bash
EXPO_PUBLIC_MAP_STYLE_URL=https://your-map-style-url.example/style.json
```

MapLibre React Native is native code and cannot run inside Expo Go. After installing or changing
the map package/config plugin, rebuild the app binary:

```bash
eas build -p android --profile preview
eas build -p ios --profile preview
```

If the map area is blank, verify the device has internet access, the style URL is reachable from the
device, and the app was rebuilt after adding `@maplibre/maplibre-react-native`.

## Receipt OCR and Expo Doctor

Receipt scanning uses `@react-native-ml-kit/text-recognition` for on-device OCR in EAS builds.
Expo Doctor reports that package as untested on React Native New Architecture, so it is intentionally
excluded from `expo.doctor.reactNativeDirectoryCheck` in `package.json`. This keeps build checks
focused on actionable warnings while preserving offline/private receipt scanning.

When the native ML Kit module is unavailable, such as inside Expo Go, the app falls back to
OCR.space through `src/lib/receipt-ocr-cloud.ts`.

## App icon assets

The launcher and splash assets are Payment Tracker-specific: a receipt, peso mark, and location pin.
Regenerate them from the deterministic drawing script when the icon needs to change:

```bash
powershell -ExecutionPolicy Bypass -File scripts/generate-app-icons.ps1
```

The generated assets are:

- `assets/images/icon.png`
- `assets/images/android-icon-background.png`
- `assets/images/android-icon-foreground.png`
- `assets/images/android-icon-monochrome.png`
- `assets/images/splash-icon.png`
- `assets/images/favicon.png`

## Android install trust

The `preview` EAS profile still builds an APK for quick local testing. APKs installed from a browser,
chat app, or file manager can still show Google Play Protect warnings because they are sideloaded
unknown apps.

For normal device installs, use Google Play Internal Testing:

```bash
eas build -p android --profile production
eas submit -p android --profile production
```

The production Android build is configured as an app bundle, and `submit.production.android.track`
is set to `internal` in `eas.json`. For the first Google Play upload, Google may require creating the
app and uploading the AAB manually in Play Console before API-based EAS Submit works.

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
