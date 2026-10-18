# Android and iOS release guide

## EAS configuration

`apps/mobile/app.config.ts` defines scheme `lifeflow`, adaptive icon, splash, permission descriptions and placeholders `com.example.lifeflow`. Replace these with identifiers owned by the publisher. Set EXPO_PUBLIC_EAS_PROJECT_ID and public production API/auth variables. `eas.json` defines development-client, internal preview and production profiles. Create the EAS project and supply signing credentials through the account owner; no signing certificates are stored here.

Install/configure EAS CLI and run `eas build --profile development --platform android` or `ios` from the mobile directory. Use the matching development build rather than assuming Expo Go supports push/custom native modules. Preview builds are internal; Android preview creates an APK. Production auto-increments versions. Recheck required Android target SDK, supported iOS version and store SDK deadlines before building.

## Device acceptance

Test registration, email verification, PKCE redirects, recovery, restoration, logout, task creation/completion, camera/photo/file upload, background processing, date confirmation, permission denial, reminders, household revocation, AI approvals and account deletion on both platforms. Test low connectivity, large text and both themes. Reinstall/revoke notifications and verify device registration handling. Push notifications depend on operating-system policy/connectivity and cannot guarantee exact delivery time.

## Google Play checklist

- Own package ID/signing key, production API, privacy/support/deletion URLs and release assets.
- Complete Data safety disclosures from actual collection/third-party processing; verify account deletion instructions and endpoint behavior.
- Provide screenshots from the actual Android app, feature graphic, app icon and accurate metadata.
- Complete internal testing, permission review, crash review, content rating and current target-SDK requirements.
- Configure billing products and test subscription purchase/restore/cancel/refund/expiry only after the billing UI/integration is finished.

## Apple checklist

- Own bundle ID, signing/provisioning, APNs setup, associated URLs and production backend.
- Validate email recovery/deep links, required usage descriptions, privacy labels and account deletion.
- Provide actual supported-device screenshots, app icon, review notes and a review account.
- Test TestFlight builds and restore purchases before monetizing; implement Sign in with Apple if required by the final sign-in options.
- Verify current submission SDK and privacy-manifest requirements and include all third-party SDK declarations.

Billing requirements vary by storefront and program. Review the current [Apple guidelines](https://developer.apple.com/app-store/review/guidelines/) and [Google Play Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738) before enabling purchases. The current code only verifies backend entitlements; no store payment flow is claimed complete.

## Metadata draft

Name: LifeFlow AI. Tagline: Organize Life. Automate the Important. Description: Keep tasks, documents, reminders and life-event checklists together. Review suggested dates and AI actions before they become responsibilities. Share selected household tasks while keeping your document vault private.

Capture screenshots showing real seeded test-account tasks, document review, reminder history, workflow progress and privacy controls. Do not include real IDs, contacts or document contents. Recheck screenshot dimensions/counts in each store at submission time. There has been no build submission or store approval.
