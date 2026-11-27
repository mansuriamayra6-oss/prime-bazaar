# Prime Bazaar Mobile Release Guide (Android & iOS via Capacitor)

## Prerequisites
- Node.js 20+ / Bun 1.4+
- Android Studio (with Android SDK Platform 34+ & JDK 17) for Android `.aab` / `.apk`
- macOS + Xcode 15+ & CocoaPods (`sudo gem install cocoapods`) for iOS `.ipa`

## 1. Web Build & Capacitor Project Sync (Dev vs Production)
- **Production Bundle (APK / AAB / IPA)**:
  ```bash
  npm run build
  npx cap add android   # first-time only
  npx cap add ios       # first-time only (macOS)
  npm run cap:sync
  ```
- **Development Live Reload on Device/Emulator**:
  ```bash
  CAPACITOR_SERVER_URL=http://10.0.2.2:3000 npx cap sync android
  ```

## 2. App Icons & Splash Screens
Place 1024×1024 `assets/icon.png` and 2732×2732 `assets/splash.png` (matching `/public/pwa-512x512.png` and `#047857` brand background), then generate adaptive Android & iOS assets:
```bash
npx @capacitor/assets generate --android --ios
```

## 3. Deep Links & Domain Verification
1. Update `/public/.well-known/assetlinks.json` with your Play App Signing SHA-256 fingerprint (`keytool -list -v -keystore release.keystore`).
2. Update `/public/.well-known/apple-app-site-association` with your Apple Developer Team ID (`APPLE_TEAM_ID`).
3. Supported Universal/App Link routes: `/product/*`, `/category/*`, `/cart`, `/orders`, `/seller/*`, `/promotions`, `/account`, `/`.
4. Ensure both files are served at `https://primebazaarfashion.in/.well-known/*` with `application/json` content-type.

## 4. Native Permissions & Keys
- **Android (`android/app/src/main/AndroidManifest.xml`)**: Camera (`CAMERA`), Photos (`READ_MEDIA_IMAGES`), Push Notifications (`POST_NOTIFICATIONS`), Biometric (`USE_BIOMETRIC`), and `app_links` intent filters (`autoVerify="true"`).
- **Android Push (`google-services.json`)**: Place Firebase `google-services.json` inside `android/app/` (never commit private server keys).
- **iOS (`ios/App/App/Info.plist`)**: Add `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSFaceIDUsageDescription`, and enable **Push Notifications** + **Associated Domains** (`applinks:primebazaarfashion.in`) in Xcode Signing & Capabilities.

## 5. Building Signed Release Artifacts (Local Studio / Xcode)
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

