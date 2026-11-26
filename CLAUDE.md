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
  - JS-only changes can ship by OTA: `eas update --channel production --environment production --message "…"`. **Always pass `--environment production`.** The Firebase keys (`FIREBASE_*`) are EAS environment variables, and without the flag the update's `extra.firebase` is empty. The app then throws on launch in `src/firebase/config.ts`, and expo-updates silently rolls back to the built-in JS, so the update looks like it never arrived.
  - An OTA reaches only store builds whose `version` matches its runtime. Check the store version before blaming the update.
  - To verify a published update, fetch its manifest and check that `extra.expoClient.extra.firebase` has all six keys: `curl -s https://u.expo.dev/<projectId> -H "expo-runtime-version: <version>" -H "expo-platform: ios" -H "expo-channel-name: production" -H "expo-protocol-version: 1" -H "accept: multipart/mixed"`.
  - Native changes need a new store build. The user uploads builds by hand (Transporter for iOS, Play Console for Android), not with `eas submit`.
  - Once a version is released on the App Store, the next store build needs a new `version`.
- After installing a native package, rebuild the local dev client:
  - `cd ios && pod install && cd .. && npx expo run:ios`
  - `npx pod-install` has silently left `ios/Podfile.lock` unchanged before. Check that the new pod is listed in it.
  - `ios/` is gitignored.
- Load optional native modules lazily (`await import('expo-print')` inside the action) so a binary mismatch breaks only that action, not every screen that imports the file.

## Firestore
- After changing `firestore.rules`, test them on the emulator, then deploy with `firebase deploy --only firestore:rules`. The `firebase` CLI is global, not in node_modules, so `npx firebase` fails.
  - Port 8080 is often taken; for one-off rules tests run the emulator on other ports via a throwaway config (`firebase --config <file> …`).
  - The emulator writes `firestore-debug.log` to the working directory. It's gitignored; never commit it.
  - Tests use `@firebase/rules-unit-testing` with `firebase emulators:exec --only firestore --project demo-tribe313 "node test.mjs firestore.rules"`.
- Admins:
  - The UI reads `appUser.isAdmin` from the user doc.
  - Rules read the `admin` token claim. `promoteAdmin` sets both.
  - `AuthContext` force-refreshes the ID token when the two disagree.
- Live listeners: Firestore closes an `onSnapshot` listener for good after an error. Never call `onSnapshot` directly. Use `listenQuery` or `listenDoc` (or `resilient()` for custom cases) from `src/lib/live.ts`, which re-subscribe with backoff so a screen can't freeze until the app restarts.
- Recurring events: admins save an `eventSeries` doc; `functions/src/events/series.ts` keeps its next 5 weeks as ordinary `events` (ids `<seriesId>_<YYYY-MM-DD>`, plus `seriesId`/`seriesDate`/`seriesLabel`). Dates and times are Toronto wall-clock. The date logic lives once in `functions/src/shared/recurrence.ts` (no imports) and the app re-exports it from `src/lib/recurrence.ts`; tests are in `src/lib/__tests__/recurrence.test.ts`. Deleting one date of a series adds it to `skipDates` so it isn't recreated. Series events don't send "New event" pushes or award early-bird; `remindTomorrow` (18:00 Toronto) reminds for every event.
- Local emulators, for trying the app without touching live data:
  - `npm run emulators` starts Auth, Firestore and Functions from `firebase.emulators.json` (Firestore on 8181, Functions on 5001, UI on 4010) with the `demo-tribe313` project. Rules reload on change; Functions run `functions/lib`, so rebuild after editing `functions/src`. Geocode and directions fail locally (no Maps key).
  - `npm run emulators:seed` waits for `onUserCreate` (which writes new users as pending) before writing its own user docs, then adds coach@test.local (admin), member@test.local and pending@test.local, password `test1234`, with sample benchmarks.
  - Start the app with `npm run start:local` (`EXPO_PUBLIC_USE_EMULATORS=1 expo start --clear`). On a real phone, also set `EXPO_PUBLIC_EMULATOR_HOST` to the Mac's IP. Sign out of any real account first; the emulator doesn't know it.
- Compiled Cloud Functions in `functions/lib` are committed. Rebuild them with `npm --prefix functions run build`, and don't hand-edit them.

## Shared UI (use these, don't restyle per screen)
- Buttons: `AppButton` (`variant` primary/secondary/text, `tone` danger/onDark) and `AppFab`, in `src/components/AppButton.tsx`. Don't use Paper's `Button` or `FAB` directly.
- Lists: `SectionHeader`, `CardBox`, `CardRow` and `ExpandableCard` in `src/components/Cards.tsx`, plus `cardStyles.content` for screen padding. Don't use Paper's `Card` or `List.Item` for lists.
  - A `CardRow` with `onPress` is a single VoiceOver element, so don't put other buttons inside it. Leave `onPress` off when the row has its own buttons.
- Header menu: `HeaderMenu` (`src/components/HeaderMenu.tsx`) is the ☰ on every tab's header. A full-width panel that drops from under the header: Settings for everyone; Admin (carpool locations + approvals, `app/admin/index.tsx`, with a pending-count bubble) and Coach for admins only. New app-wide or admin screens go there, not as per-tab buttons or header icons.
- Search: `matchesWords` in `src/lib/search.ts` is the one search rule: every word must match, in any order, ignoring case and accents.
- Choosing from a list: `await pickOne({...})` or `await pickMany({...})` from `src/lib/picker.ts`. It opens `app/pick.tsx`, a search field over card rows, and returns the chosen ids, or null on Back. Use it instead of building a new picker screen. Its options (`allowCustom`, `selected`, `keywords`, …) are documented at the top of the file.

## Unreleased features
- Sunday Runs and Members are built but admin-only: their tabs use `href: isAdmin ? undefined : null` in `app/(tabs)/_layout.tsx`. Pushes about events aren't gated; keep prod free of events until release.
- There's no Home tab. Training is the first screen (`unstable_settings.initialRouteName`), and sign-in, onboarding and `app/index.tsx` all land on `/training`.

## Onboarding (`app/onboarding.tsx`)
- Shown once per account per phone, before the tabs. The "done" flag is in AsyncStorage (`src/lib/onboarding.ts`), never in Firestore, so a new phone shows it again, pre-filled from the profile.
- Every step is optional; "Skip for now" saves nothing. Later steps (equipment, choosing a coach) are in `docs/backlog.md`.

## Workout days
- Members pick 3 weekdays, saved as `workoutDays` on `benchmarkProfiles/{uid}` (`Date.getDay()` numbers). They're set in onboarding or in `WorkoutDaysSheet` (`src/benchmark/components/WorkoutDays.tsx`), opened from Training. The workouts land on them in Monday-first week order, and each workout card shows its day. The date logic is in `src/lib/schedule.ts` with tests.

## Benchmark feature (`src/benchmark/`, `app/benchmark/`, `app/(tabs)/benchmark.tsx`, `app/(tabs)/training.tsx`)
- Screens:
  - The Benchmark tab is for logging only: the summary, New benchmark and Progress. Keep it that way.
  - The Training tab holds the workouts, coach extras, test plans and tips.
  - `ProgressView` (charts, past benchmarks, PDF) is shared by `app/benchmark/progress.tsx` and the coach screen's Progress segment.
- A new benchmark is pre-filled with each test's last result, marked "Same as <date>" until it's changed or confirmed. Saving needs at least one result entered that day. The pre-fill logic is in `engine/progress.ts`.
- Every saved benchmark stores `version` and is always scored and rendered with that version (`registry.ts`).
- Until the app launches, nobody has saved real benchmarks, so v1 (`versions/v1/data.json` and `index.ts`) can still be edited. Once members save real ones, v1 is frozen: changing the tests, scoring or test order means adding `versions/v2/` and bumping `LATEST_VERSION`.
- Tests whose meaning changes get a new key rather than reusing an old one (`farmer`, `sled`, `ws1l`/`ws1r`), so old saved numbers are never read with new rules.
- A logged test with `partOf` is one part of a scored test: the one-leg wall sit logs `ws1l` and `ws1r` and is scored on the weaker leg as `ws1`.
- **Rule: each level is a fixed target of a weight and a number of reps (or a distance or time). A member reaches a level when they hit both.** Falling short on either means the level below. No formulas (estimated maxes, trading weight for reps).
- **Rule: a distance in feet always shows metres too.** In text, `formatFeet` (`engine/format.ts`) gives "200 ft (61 m)". In a picker, give the column `alt` (the version's `metres`), so each wheel row shows "61 m" on the left and "200 ft" on the right and both move together.
- Four tests log a second number, a `companion` in the version: bench `benchlb` (weight on the bar), deadlift `dlreps`, farmer's carry `farmerft` (distance in 50 ft steps), sled `sledlb`. A level only counts when the second number meets the test's condition: bodyweight or more, 5 reps or more, or 200 ft or more. Weights may be up to 5 lb under a target (`ALLOWANCE`). A benchmark saved without the second number counts as done the standard way, so old benchmarks keep their scores without a v2. Reps and distance are pre-filled with their test; the weights start at today's bodyweight (`carries: false`) so a "Same as" result isn't failed by an old bar. They're shown next to it ("8 reps · 185 lb"), but never charted. They live in `results`, so the Firestore rules don't change.
- Weights from bodyweight: `engine/weights.ts` adds the pounds after "% of bodyweight" in plans and how-to steps (`ExplainText` with `bodyweight`), and `standardsFor`/`entryNote` in the version give targets in pounds. A `WeightNote` under each list says which bodyweight is used. Don't write example people ("a 200 lb man") into the data.
- Tests the photo library lacks use a drawn `TestFigure` (`figure` in the data). Free Exercise DB has no face-the-wall squat or sled loop.
- Ideas agreed for later (levels 4–6, equipment) are in `docs/benchmark-roadmap.md`.
- Rewrite outdated wording in the help text at display time, in the version's `index.ts`, not in the data.
- In the UI a logged session is a "benchmark", never "entry", "session" or "log test".
- Exercise photos: `node scripts/benchmark/fetch-photos.mjs` downloads them, resizes them with macOS `sips`, and regenerates `src/benchmark/photos.ts`.
