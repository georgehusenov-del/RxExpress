# App Privacy And Data Safety Mapping

Last updated: May 17, 2026

This file is based on the current codebase behavior.

## Actual Data Use Confirmed In App Code

- Authentication token stored locally in secure storage
- Driver account/profile data fetched from backend
- Foreground location permission and live location updates while on duty
- Camera access for QR scanning and proof-of-delivery photos
- Photo capture, signature capture, notes, and failed-attempt reasons for delivery operations
- No background location permission in app config
- No social login
- No contacts access
- No microphone usage
- No advertising SDKs found

## Google Play Data Safety Suggested Answers

### Does the app collect or share data?
Yes.

### Data types likely collected

Personal info:
- Name
- Email address
- Phone number

Photos and videos:
- Delivery proof photos

App activity:
- In-app actions related to delivery status, scanning, POD submission, failed attempts, and history

Location:
- Precise location while the app is in use and driver status is on duty

App info and performance:
- Limited diagnostics or operational logging may be processed by backend services

### Is data encrypted in transit?
Yes, based on the app communicating with HTTPS backend endpoints.

### Can users request deletion?
Answer based on your business process. If no formal in-app deletion workflow exists, do not claim an in-app deletion feature unless your backend/support process supports it.

### Is data required for core functionality?
Yes for account info, camera use, delivery evidence, and in-use location during delivery operations.

## Apple Privacy Nutrition Labels Suggested Answers

### Data linked to the user
- Name
- Email address
- Phone number
- Precise location
- Photos
- User content such as notes and signatures

### Purposes
- App functionality
- Security
- Customer support if applicable
- Operational analytics only if your backend uses it for service operation

### Data not observed in current code
- Contacts
- Health data
- Financial payment card data handled directly in app
- Browsing history
- Advertising data

## Portal Warnings

- Do not mark background location, because the current app config does not request it.
- Do not mark microphone/audio recording, because the current app config disables Android audio recording for the camera plugin.
- Do not claim account creation or public consumer use if this app is only for authorized drivers.
