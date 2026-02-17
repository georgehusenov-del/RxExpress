# RX Expresss - Android App

## How to Build APK

### Prerequisites
- **Android Studio** (latest version) - Download from https://developer.android.com/studio
- **JDK 17** (usually bundled with Android Studio)

### Steps to Build

1. **Open Android Studio**
2. Click **"Open"** and select the `RxExpresss.Android` folder
3. Wait for Gradle sync to complete (first time takes 2-3 minutes)
4. Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**
5. APK will be at: `app/build/outputs/apk/debug/app-debug.apk`

### Install on Phone
- Transfer the APK to your Android phone
- Open it and tap **Install** (enable "Install from unknown sources" if prompted)
- Or connect phone via USB and click **Run** (green play button) in Android Studio

### Change Server URL
Edit `app/build.gradle` line:
```gradle
buildConfigField "String", "BASE_URL", "\"https://your-production-url.com\""
```

### Build Release APK (for Play Store)
1. **Build > Generate Signed Bundle/APK**
2. Choose **APK**
3. Create new keystore or use existing
4. Select **release** build type
5. APK at: `app/build/outputs/apk/release/app-release.apk`

## Features
- Full WebView wrapper with all web app functionality
- Splash screen with RX Expresss branding
- Back button navigation within app
- Swipe to refresh
- Offline detection with retry
- Camera permission for QR scanning
- GPS permission for delivery tracking
- Google Maps opens in native Maps app
- Phone numbers open dialer
- Status bar matches app theme

## App Info
- **Package:** com.rxexpresss.app
- **Min SDK:** Android 7.0 (API 24)
- **Target SDK:** Android 14 (API 34)
