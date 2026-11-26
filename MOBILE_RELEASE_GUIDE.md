# Prime Bazaar Mobile Release Guide (Android & iOS via Capacitor)

## Prerequisites
- Node.js 20+ / Bun 1.4+
- Android Studio (with Android SDK Platform 34+ & JDK 17) for Android `.aab` / `.apk`
- macOS + Xcode 15+ & CocoaPods (`sudo gem install cocoapods`) for iOS `.ipa`

## 1. Web Build & Capacitor Project Sync
```bash
npm run build
npx cap add android   # first-time only
npx cap add ios       # first-time only (macOS)
npx cap sync
```

## 2. Deep Links & Domain Verification
1. Update `/public/.well-known/assetlinks.json` with your Play App Signing SHA-256 fingerprint (`keytool -list -v -keystore release.keystore`).
2. Update `/public/.well-known/apple-app-site-association` with your Apple Developer Team ID (`APPLE_TEAM_ID`).
3. Ensure both files are served at `https://primebazaarfashion.in/.well-known/*` with `application/json` content-type.

## 3. Native Permissions & Keys
- **Android (`android/app/src/main/AndroidManifest.xml`)**: Camera (`CAMERA`), Photos (`READ_MEDIA_IMAGES`), Push Notifications (`POST_NOTIFICATIONS`), and `app_links` intent filter for `/product/*`, `/category/*`, `/orders`.
- **Android Push (`google-services.json`)**: Place Firebase `google-services.json` inside `android/app/` (never commit private server keys).
- **iOS (`ios/App/App/Info.plist`)**: Add `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, and enable **Push Notifications** + **Associated Domains** (`applinks:primebazaarfashion.in`) in Xcode Signing & Capabilities.

## 4. Building Signed Release Artifacts
- **Android Play Store (.aab)**:
  ```bash
  npx cap open android
  # In Android Studio: Build -> Generate Signed Bundle / APK -> Android App Bundle (.aab)
  ```
- **iOS App Store (.ipa)**:
  ```bash
  npx cap open ios
  # In Xcode: Product -> Archive -> Distribute App -> App Store Connect
  ```
