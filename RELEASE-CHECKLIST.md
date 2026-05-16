# Release Checklist

## App-side items completed
- Background location claims removed from app config to match the current implementation.
- iOS `buildNumber` and Android `versionCode` added.
- EAS production config added in `eas.json`.
- Expo package warnings addressed in `package.json`.

## Required before App Store submission
- Backend POD photo save issue resolved and verified in testing.
- Publish [PRIVACY-POLICY.md](PRIVACY-POLICY.md) to a public URL and place that URL in App Store Connect and Google Play Console. Current intended URL: https://www.rxexpresss.com/Home/PrivacyPolicy
- Use [APP-PRIVACY-DATA-MAPPING.md](APP-PRIVACY-DATA-MAPPING.md) to complete Apple privacy nutrition labels.
- Use [APP-PRIVACY-DATA-MAPPING.md](APP-PRIVACY-DATA-MAPPING.md) to complete Google Play Data safety form.
- Test a production iOS build on a physical iPhone.
- Test a production Android build on a physical device.
- Use [STORE-SUBMISSION-PACK.md](STORE-SUBMISSION-PACK.md) for store descriptions, review notes, screenshot planning, and support metadata.
- Review credentials are still required if Apple or Google asks for a test login during review.

## Suggested build commands
```bash
npm install
npx expo-doctor
npx tsc --noEmit
npx eas build --platform ios --profile production
npx eas build --platform android --profile production
```