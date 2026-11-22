# Tribe313

Closed-group mobile app for events, RSVPs, carpool rides, and attendance badges. React Native + Expo front end; Firebase Auth / Firestore / Cloud Functions back end; Expo Push for notifications.

## One-time setup

### 0. Environment variables

App config is driven by `app.config.js` + a `.env` file (never committed). `app.json` is gitignored.

```bash
cp .env.template .env
# fill in .env with your keys (see sections below)
```

For EAS cloud builds, add each variable as an EAS secret instead:
```bash
eas secret:create --scope project --name VARIABLE_NAME --value VALUE
```

### 1. Firebase project

1. Create a Firebase project at https://console.firebase.google.com.
2. Enable **Authentication → Email/Password**.
3. Enable **Firestore** (production mode).
4. Enable **Cloud Functions** (Blaze plan — pay-as-you-go is required for outbound HTTPS / Google Maps calls).
5. Put the project ID into [`.firebaserc`](.firebaserc).
6. Copy the Firebase Web config values into `.env` (`FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, etc.).

### 2. Google Maps

1. Create a Google Cloud API key with **Geocoding API**, **Directions API**, **Maps SDK for Android**, **Maps SDK for iOS** enabled.
2. Store the backend key as a Functions secret:
   ```bash
   firebase functions:secrets:set GOOGLE_MAPS_KEY
   ```
3. Put the Android SDK key in `.env` → `GOOGLE_MAPS_API_KEY` (iOS uses Apple Maps by default; see `react-native-maps` docs if you want Google Maps on iOS).
4. For EAS builds, add it as an EAS secret:
   ```bash
   eas secret:create --scope project --name GOOGLE_MAPS_API_KEY --value YOUR_KEY
   ```

### 3. Admin allowlist

Seed admin emails (auto-promoted on first login):

1. Copy `.env.template` to `.env` inside the `functions/` directory:
   ```bash
   cp functions/.env.template functions/.env
   ```
2. Edit `functions/.env` and fill in the allowlist:
   ```
   ADMIN_ALLOWLIST=founder@example.com,cofounder@example.com
   ```
3. Deploy:
   ```bash
   firebase deploy --only functions:onUserCreate
   ```

### 4. EAS

```bash
npm i -g eas-cli
eas login
eas init
```

Put the returned project ID in `.env` → `EAS_PROJECT_ID`.

## Daily development

The app uses native modules (`expo-notifications`, `expo-location`, Google Maps) that Expo Go doesn't fully support, so development runs against a custom **dev client** (`expo-dev-client`) instead of Expo Go.

```bash
npm install
cd functions && npm install && cd ..

# One-time (and after any new native dependency): build + install a dev client
eas build --profile development --platform ios
eas build --profile development --platform android

# Start Expo — connects to the installed dev client, not Expo Go
npx expo start
```

Plain `npx expo start` talks to the **live** Firebase project. To try changes without touching real data, use the local emulators below.

### Test locally with the emulators

The app can run against local Auth, Firestore and Cloud Functions emulators instead of the live project. Everything runs under the `demo-tribe313` project ID, which Firebase never connects to real resources, so nothing you do reaches live data. The emulators enforce the real `firestore.rules`.

Needs the global `firebase` CLI and Java.

```bash
# 1. Start Auth, Firestore and Functions (terminal 1). Leave it running.
npm run emulators

# 2. Add test accounts and sample benchmarks (terminal 2, once step 1 says "All emulators ready")
npm run emulators:seed

# 3. Start the app pointed at the emulators (terminal 2)
EXPO_PUBLIC_USE_EMULATORS=1 npx expo start
```

4. In the app, **sign out** of any real account first (the emulator doesn't know it), then sign in with one of the seeded accounts. The password for all of them is `test1234`:

| Account | What it is |
|---|---|
| `coach@test.local` | Approved admin (coach), with two benchmarks |
| `member@test.local` | Approved member, with two benchmarks and an exercise from the coach |
| `pending@test.local` | Waiting for approval |

Good to know:

- **Ports:** Auth on 9099, Firestore on 8181, Functions on 5001, and the Emulator UI (to browse the data) at http://127.0.0.1:4010. They're set in [`firebase.emulators.json`](firebase.emulators.json), separate from `firebase.json`, so they don't clash with an emulator already using 8080.
- **Reset:** the data is wiped each time the emulators stop. Run `npm run emulators:seed` again after restarting. It's safe to re-run at any time. To wipe without restarting:
  ```bash
  curl -X DELETE "http://127.0.0.1:8181/emulator/v1/projects/demo-tribe313/databases/(default)/documents"
  curl -X DELETE "http://127.0.0.1:9099/emulator/v1/projects/demo-tribe313/accounts"
  npm run emulators:seed
  ```
  The accounts get new IDs, so each one sees onboarding again (that flag is kept on the phone, per account).
- **Rules:** the emulator reads `firestore.rules` directly and reloads it when it changes.
- **Functions:** the emulator runs the compiled code in `functions/lib`. After editing `functions/src`, run `npm --prefix functions run build` and the emulator reloads it. Approving, promoting, deactivating, reinstating, deleting an account, new sign-ups and the push triggers all work. Pushes go nowhere, because simulators don't have push tokens.
- **Real phone:** the iOS simulator and Android emulator find the Mac on their own. On a physical phone, also set your Mac's IP: `EXPO_PUBLIC_USE_EMULATORS=1 EXPO_PUBLIC_EMULATOR_HOST=192.168.x.x npx expo start`.
- **Not covered:** address lookup and directions need the Google Maps key, which only exists in the live project, so they fail locally. Scheduled functions (the 6 pm reminders) don't run on the emulator.
- **Back to live:** stop Expo and start it again without `EXPO_PUBLIC_USE_EMULATORS=1`.

### Build + run on device

```bash
# Both platforms in one go
eas build --profile production --platform all

# Or one at a time
eas build --profile production --platform ios
eas build --profile production --platform android
```

The `production` profile is signed for store distribution, so the build isn't directly installable like a dev client — get it onto a device via:

- **iOS**: `eas submit --platform ios` uploads the build to TestFlight; install it there.
- **Android**: the profile builds an `.aab` for Play Console (`eas submit --platform android`). For a directly-installable `.apk` instead, add an `android.buildType: "apk"` override to the `production` profile in [`eas.json`](eas.json), or use `eas build --profile preview` for ad-hoc internal distribution.

### Deploy backend

```bash
firebase deploy --only firestore:rules,firestore:indexes,functions
```

## Project structure

```
app/                  expo-router screens (auth, gate, tabs, event, admin)
src/                  shared client code (firebase, hooks, components, lib)
functions/            Cloud Functions (TypeScript, 2nd gen)
firestore.rules       access control
firestore.indexes.json
firebase.json
eas.json
app.config.js        dynamic Expo config (reads from .env)
.env.template        copy to .env and fill in secrets
```

## Notes

- The email-verified + admin-approved + not-evicted state machine is enforced by the auth gate in [`src/hooks/useAuthGate.ts`](src/hooks/useAuthGate.ts) and the top-level `app/index.tsx` redirect.
- Evicted users aren't deleted — they see the "Chopping block" screen and can re-receive push notifications to rejoin by attending a future session.
- Admin promotion is automatic for emails in the `ADMIN_ALLOWLIST` parameter; further admins are promoted via the `promoteAdmin` callable (no UI yet — call from the Functions shell).
