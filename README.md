# RxEx Driver — Expo Production Test Build

This app is built against the RX Expresss Driver API documentation.

## API base URL
`https://backend.rxexpresss.com/api`

Configured in `app.json` under `expo.extra.apiBaseUrl`.

## Features included
- Driver login via `POST /auth/login`
- Session restore via `GET /auth/me`
- Profile via `/driver-portal/profile`
- Duty toggle via `/driver-portal/status?status=...`
- GPS location pings via `/driver-portal/location`
- Deliveries list via `/driver-portal/deliveries`
- Status changes via `/driver-portal/deliveries/{id}/status`
- QR scan via `/admin/scan/{qrCode}`
- POD 3-photo upload via `/driver-portal/deliveries/{id}/pod`
- Copay collection via `/driver-portal/deliveries/{id}/collect-copay`
- Failed attempt via `/admin/orders/{id}/log-attempt`
- History via `/driver-portal/history`

## Local test steps
1. Install Node.js LTS.
2. Install Expo Go on your Android/iPhone.
3. Unzip project.
4. Run:

```bash
npm install
npx expo start
```

5. Scan the QR code with Expo Go.
6. Login with a real driver account from your backend.

## Production build
For app stores, use EAS Build:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android
neas build --platform ios
```

## Security notes
- JWT is stored using `expo-secure-store`.
- No PHI is stored persistently beyond the token.
- API calls use HTTPS only.
- Do not log patient names/addresses in production telemetry.
- Add your privacy policy URL before store submission.
