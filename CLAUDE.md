# Tribe313

Expo SDK 54 · expo-router 6 (typed routes) · React Native 0.81 · react-native-paper (MD3, light only) · Firebase JS SDK v12 (Auth, Firestore) · Cloud Functions v2 in `functions/`.

## Checks before calling something done
- After every feature, review your own diff before calling it done, and report what you found. Look for bugs and edge cases, VoiceOver access (no buttons inside a tappable row), stale or frozen data, dev-mode double effects, dead code and missing tests. Fix what's clearly wrong and list what's left as a known trade-off.
- Pure logic goes in `src/lib/` or `src/benchmark/engine/` with tests in `__tests__/`, so it can be tested without rendering screens.
- `npm test`: jest-expo unit tests (`src/**/__tests__/*.test.ts`).
- `npm run tsc` and `npx expo lint`. Two tsc errors and two lint errors in `app/event/[id].tsx` already exist and aren't caused by your change. Anything else is yours to fix.
- `expo lint` caches results in `.expo/cache/eslint` and can report stale errors, or hide real ones, after files change. Run `rm -rf .expo/cache/eslint` first when the result looks wrong.
- Typed routes are stale after adding a screen: run `CI=1 timeout 60 npx expo start --offline` once to regenerate them.
- There's no Prettier config. Don't run `prettier` with its defaults, because it switches the code to double quotes and 80 columns. If you must format, use `npx prettier --single-quote --print-width 110 --trailing-comma all`.

## Native modules, versions and shipping
- `runtimeVersion` uses the `appVersion` policy (`app.config.js`). **Adding or upgrading a package with native code means bumping `version` in `app.config.js`.** Without the bump, `eas update` sends the new JS to old binaries and the app crashes with "Cannot find native module …".
  - JS-only changes can ship by OTA (`eas update`).
  - Native changes need a new EAS or store build.
- After installing a native package, rebuild the local dev client:
  - `cd ios && pod install && cd .. && npx expo run:ios`
  - `npx pod-install` has silently left `ios/Podfile.lock` unchanged before. Check that the new pod is listed in it.
  - `ios/` is gitignored.
- Load optional native modules lazily (`await import('expo-print')` inside the action) so a binary mismatch breaks only that action, not every screen that imports the file.

## Firestore
- After changing `firestore.rules`, test them on the emulator, then deploy with `firebase deploy --only firestore:rules`. The `firebase` CLI is global, not in node_modules, so `npx firebase` fails.
  - Port 8080 is often taken; run the emulator on another port (e.g. 8181) via a throwaway `firebase.json` outside the repo.
  - The emulator writes `firestore-debug.log` to the working directory. It's gitignored; never commit it.
  - Tests use `@firebase/rules-unit-testing` with `firebase emulators:exec --only firestore --project demo-tribe313 "node test.mjs firestore.rules"`.
- Admins:
  - The UI reads `appUser.isAdmin` from the user doc.
  - Rules read the `admin` token claim. `promoteAdmin` sets both.
  - `AuthContext` force-refreshes the ID token when the two disagree.
- Live listeners: Firestore closes an `onSnapshot` listener for good after an error. Never call `onSnapshot` directly. Use `listenQuery` or `listenDoc` (or `resilient()` for custom cases) from `src/lib/live.ts`, which re-subscribe with backoff so a screen can't freeze until the app restarts.
- Compiled Cloud Functions in `functions/lib` are committed. Rebuild them with `npm --prefix functions run build`, and don't hand-edit them.

## Shared UI (use these, don't restyle per screen)
- Buttons: `AppButton` (`variant` primary/secondary/text, `tone` danger/onDark) and `AppFab`, in `src/components/AppButton.tsx`. Don't use Paper's `Button` or `FAB` directly.
- Lists: `SectionHeader`, `CardBox`, `CardRow` and `ExpandableCard` in `src/components/Cards.tsx`, plus `cardStyles.content` for screen padding. Don't use Paper's `Card` or `List.Item` for lists.
  - A `CardRow` with `onPress` is a single VoiceOver element, so don't put other buttons inside it. Leave `onPress` off when the row has its own buttons.
- Search: `matchesWords` in `src/lib/search.ts` is the one search rule: every word must match, in any order, ignoring case and accents.
- Choosing from a list: `await pickOne({...})` or `await pickMany({...})` from `src/lib/picker.ts`. It opens `app/pick.tsx`, a search field over card rows, and returns the chosen ids, or null on Back. Use it instead of building a new picker screen. Its options (`allowCustom`, `selected`, `keywords`, …) are documented at the top of the file.

## Benchmark feature (`src/benchmark/`, `app/benchmark/`, `app/(tabs)/benchmark.tsx`)
- Every saved benchmark stores `version` and is always scored and rendered with that version (`registry.ts`).
- `versions/v1/data.json` must never be edited. Changing the tests, scoring or test order means adding `versions/v2/` and bumping `LATEST_VERSION`.
- Rewrite outdated wording in the help text at display time, in the version's `index.ts`, not in the data.
- In the UI a logged session is a "benchmark", never "entry", "session" or "log test".
- Exercise photos: `node scripts/benchmark/fetch-photos.mjs` downloads them, resizes them with macOS `sips`, and regenerates `src/benchmark/photos.ts`.
