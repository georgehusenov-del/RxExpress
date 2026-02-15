# RX Expresss - Mobile App Build & Store Submission Guide

## Overview
RX Expresss is configured as both a **PWA** (Progressive Web App) and a **Capacitor** app for native iOS/Android builds.

---

## Option A: Progressive Web App (PWA)
The PWA is **already live** and works immediately. Users can install it from their browser.

### How Users Install the PWA:
- **Android Chrome:** Visit the app URL -> Tap "Install" banner or Menu -> "Install App"
- **iOS Safari:** Visit the app URL -> Tap Share -> "Add to Home Screen"
- **Desktop Chrome/Edge:** Visit the app URL -> Click install icon in address bar

### PWA Features:
- Offline support with cached pages
- App-like experience (no browser chrome)
- Push notification ready
- Home screen icon with splash screen

---

## Option B: Native App Builds with Capacitor

### Prerequisites
You need the following installed on your **local development machine**:

| Requirement | iOS | Android |
|---|---|---|
| **OS** | macOS only | macOS, Windows, or Linux |
| **IDE** | Xcode 15+ | Android Studio (latest) |
| **SDK** | iOS 16+ SDK | Android SDK 33+ |
| **Account** | Apple Developer ($99/yr) | Google Play Console ($25 one-time) |
| **Node.js** | 18+ | 18+ |

### Step 1: Clone & Setup
```bash
# Clone the repository from GitHub
git clone <your-repo-url>
cd frontend

# Install dependencies
yarn install
```

### Step 2: Configure Production URL
Edit `/frontend/.env`:
```env
REACT_APP_BACKEND_URL=https://your-production-api-url.com
```

### Step 3: Build the Web App
```bash
yarn build
```

### Step 4: Add Native Platforms
```bash
# Add iOS platform (macOS only)
npx cap add ios

# Add Android platform
npx cap add android

# Sync web build to native projects
npx cap sync
```

### Step 5: Configure App Icons & Splash Screens

#### iOS
1. Open `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
2. Replace icon files with your app icons (use the generated icons in `/public/`)
3. Use a tool like [App Icon Generator](https://appicon.co/) to create all required sizes

#### Android
1. Open Android Studio -> `android/app/src/main/res/`
2. Right-click `res` folder -> New -> Image Asset
3. Select the 1024x1024 icon from `/public/icon-512x512.png`
4. Android Studio will generate all required sizes

### Step 6: Open in IDE
```bash
# iOS (opens Xcode)
npx cap open ios

# Android (opens Android Studio)
npx cap open android
```

### Step 7: Configure Signing

#### iOS Signing
1. In Xcode, select the "App" target
2. Go to "Signing & Capabilities"
3. Select your Apple Developer Team
4. Set Bundle Identifier: `com.rxexpresss.app`
5. Xcode will auto-create provisioning profiles

#### Android Signing
1. Generate a keystore:
```bash
keytool -genkey -v -keystore rx-expresss-release.keystore \
  -alias rx-expresss -keyalg RSA -keysize 2048 -validity 10000
```
2. Add to `android/app/build.gradle`:
```gradle
android {
    signingConfigs {
        release {
            storeFile file('rx-expresss-release.keystore')
            storePassword 'your-store-password'
            keyAlias 'rx-expresss'
            keyPassword 'your-key-password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

### Step 8: Build Release Binaries

#### iOS
1. In Xcode: Product -> Archive
2. Window -> Organizer -> Distribute App -> App Store Connect

#### Android
```bash
cd android
./gradlew assembleRelease
# APK at: android/app/build/outputs/apk/release/app-release.apk

# For Play Store (AAB format):
./gradlew bundleRelease
# AAB at: android/app/build/outputs/bundle/release/app-release.aab
```

---

## Store Submission

### Apple App Store

#### Required Materials:
- App Name: **RX Expresss**
- Bundle ID: `com.rxexpresss.app`
- Category: Medical / Health & Fitness
- Privacy Policy URL (required)
- Screenshots: 6.7" (iPhone 15 Pro Max), 6.5" (iPhone 11 Pro Max), 12.9" iPad Pro
- App Description (up to 4000 chars)
- Keywords (up to 100 chars)
- Support URL

#### Submission Steps:
1. Log in to [App Store Connect](https://appstoreconnect.apple.com)
2. Create New App -> Select Bundle ID
3. Fill in metadata (name, description, screenshots)
4. Upload binary from Xcode Organizer
5. Submit for Review (typically 24-48 hours)

#### Review Guidelines to Follow:
- Must have a privacy policy
- Must handle offline state gracefully (done via PWA service worker)
- Must not use private APIs
- Healthcare apps may need additional compliance documentation

### Google Play Store

#### Required Materials:
- App Name: **RX Expresss**
- Package Name: `com.rxexpresss.app`
- Category: Medical
- Content Rating questionnaire
- Privacy Policy URL (required)
- Screenshots: Phone, 7" tablet, 10" tablet
- Feature Graphic: 1024x500px
- App Description (up to 4000 chars)
- Short Description (up to 80 chars)

#### Submission Steps:
1. Log in to [Google Play Console](https://play.google.com/console)
2. Create App -> Fill in details
3. Set up Store Listing (screenshots, descriptions)
4. Complete Content Rating questionnaire
5. Set up Pricing & Distribution
6. Upload AAB file under "Production" release
7. Submit for Review (typically 1-3 days for new apps)

---

## Suggested App Store Descriptions

### Short Description (80 chars):
```
Fast pharmacy delivery with real-time tracking and proof of delivery.
```

### Full Description:
```
RX Expresss is a professional pharmacy delivery management platform 
that connects pharmacies, drivers, and patients for fast, secure 
prescription delivery.

FEATURES:
- Same-day and next-day prescription delivery
- Real-time delivery tracking
- QR code-based package verification
- Electronic signature proof of delivery
- Photo proof of delivery
- Copay collection at doorstep
- Route optimization for efficient deliveries
- Multi-stop delivery management
- HIPAA-compliant secure handling

FOR PHARMACIES:
- Easy order creation and management
- Bulk delivery scheduling
- Time window selection
- Delivery cost tracking

FOR DRIVERS:
- Optimized delivery routes
- Turn-by-turn navigation
- QR code scanning for package verification
- Digital signature capture
- Photo proof of delivery

FOR PATIENTS:
- Track your delivery in real-time
- Receive status notifications
- Secure, verified delivery
```

---

## Quick Commands Reference
```bash
# Build web app
yarn build

# Sync to native platforms
npx cap sync

# Open iOS project
npx cap open ios

# Open Android project  
npx cap open android

# Run on device/emulator
npx cap run ios
npx cap run android

# Live reload during development
npx cap run ios --livereload --external
npx cap run android --livereload --external
```

---

## Checklist Before Submission
- [ ] Privacy Policy URL created and accessible
- [ ] App icons for all required sizes
- [ ] Splash screen configured
- [ ] Screenshots captured on required device sizes
- [ ] Feature graphic created (Google Play)
- [ ] Production API URL configured
- [ ] App signing configured (iOS: provisioning profile, Android: keystore)
- [ ] Tested on physical device
- [ ] Offline handling works
- [ ] Push notifications configured (optional)
- [ ] Content rating questionnaire completed (Google Play)
- [ ] Age rating set (App Store)
