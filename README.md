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

Put the returned project ID in `app.json` → `expo.extra.eas.projectId`.

## Daily development

```bash
npm install
cd functions && npm install && cd ..

# Start Expo
npx expo start

# Start Firebase emulators (separate terminal)
firebase emulators:start
```

### Build + run on device

```bash
eas build --profile development --platform ios
eas build --profile development --platform android
```

Install the resulting dev build on a physical device (push notifications don't work in Expo Go on iOS).

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
app.json
```

See [`/Users/danishmahboob/.claude/plans/plan-help-me-build-functional-globe.md`](/Users/danishmahboob/.claude/plans/plan-help-me-build-functional-globe.md) for the implementation plan and data model.

## Notes

- The email-verified + admin-approved + not-evicted state machine is enforced by the auth gate in [`src/hooks/useAuthGate.ts`](src/hooks/useAuthGate.ts) and the top-level `app/index.tsx` redirect.
- Evicted users aren't deleted — they see the "Chopping block" screen and can re-receive push notifications to rejoin by attending a future session.
- Admin promotion is automatic for emails in the `ADMIN_ALLOWLIST` parameter; further admins are promoted via the `promoteAdmin` callable (no UI yet — call from the Functions shell).
