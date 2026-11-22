---
name: build-local
description: Build Tribe313 production store builds (iOS .ipa, Android .aab) on this Mac with `eas build --local`, verify them, and put them in builds/. Use when the user asks to build locally, make a store build, or produce an ipa/aab. Argument: ios, android or all (default all).
---

# Local store builds

Builds the `production` profile on this Mac and leaves the files in `builds/` (gitignored). Never uploads them and never deploys Firebase: `eas submit` and `firebase deploy` are for the user to run, unless they ask in this conversation.

Platforms: `$ARGUMENTS` (`ios`, `android` or `all`; empty means `all`). With `all`, build iOS first, then Android, **one at a time**.

## 1. Preflight (stop and report if any fails)

Run these in the repo root and check each result:

```bash
eas whoami                      # must print an account; if not, ask the user to run `eas login`
node -v                         # must be v24.x (Metro doesn't support Node 25)
pgrep -fl "eas build|xcodebuild|gradle|fastlane"   # must be empty: never run two builds at once
grep -n 'version: "' app.config.js
git status --short
```

- **Node:** if it isn't 24, put nvm's Node 24 first on PATH for the build commands. Don't prefix `/opt/homebrew/bin` (that brings back Homebrew's Node 25).
- **Version:** if `package.json` gained or upgraded a package with native code since the last release, `version` in `app.config.js` must be bumped first (CLAUDE.md). Ask the user before bumping.
- **Uncommitted changes:** builds use the working tree, including uncommitted files. Mention what's uncommitted so the user knows what goes into the build; don't commit for them.
- **Tools:** iOS needs `pod` (Homebrew CocoaPods, `pod --version`). Android needs `$ANDROID_HOME/platform-tools` and JDK 17. If missing, follow "Build for the stores on this Mac" in README.md.

## 2. Build

Use this environment for every build command (the stale Ruby 3.4 gem path on PATH breaks `pod`):

```bash
export PATH=$(echo $PATH | sed 's#/opt/homebrew/lib/ruby/gems/3.4.0/bin#/opt/homebrew/lib/ruby/gems/4.0.0/bin#') \
  LANG=en_US.UTF-8 \
  ANDROID_HOME=/opt/homebrew/share/android-commandlinetools \
  JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
```

Read the version from `app.config.js` (call it `<v>`). Run each build in the background, logging to the scratchpad, and wait for the completion notification instead of polling:

```bash
eas build --local --non-interactive --profile production --platform ios \
  --output builds/tribe313-<v>-ios.ipa > <scratchpad>/ios-build.log 2>&1
eas build --local --non-interactive --profile production --platform android \
  --output builds/tribe313-<v>-android.aab > <scratchpad>/android-build.log 2>&1
```

Expect 10–30 minutes each. Start the next platform only after the previous one has finished.

If you must stop a build, also stop what it started: `pkill -f "eas build --local"`, then check `pgrep -fl "xcodebuild|gradle|fastlane"` and kill leftovers. A leftover iOS build deletes signing profiles the next build needs ("unable to read … .mobileprovision").

## 3. Verify

On failure, find the real error with `grep -nE "❌|error:|FAILURE|What went wrong" <log> | head` and report it. The `expo doctor` step failing is only a warning; the build continues.

On success, check the build number from the log (`Incremented buildNumber/versionCode from X to Y`) and rename the file to include it: `builds/tribe313-<v>-build<Y>.ipa` / `.aab`. Then confirm:

- **iOS:**
  ```bash
  unzip -q -o builds/<file>.ipa -d <scratchpad>/ipa && \
  /usr/libexec/PlistBuddy -c "Print CFBundleShortVersionString" -c "Print CFBundleVersion" \
    -c "Print CFBundleIdentifier" <scratchpad>/ipa/Payload/*.app/Info.plist
  ```
  Expect `<v>`, the new build number, and `com.tribe313.app` (not `.dev`).
- **Android:**
  ```bash
  unzip -p builds/<file>.aab base/manifest/AndroidManifest.xml | strings | grep -E "<v>|screen.portrait"
  ```
  The version must appear, and `android.hardware.screen.portrait` must be listed: the `plugins/withOptionalPortrait.js` plugin marks it optional so Play doesn't flag the app.

## 4. Report

Tell the user, for each platform: the file path in `builds/`, version and build number, and anything that went wrong. Then give the upload commands for them to run:

```bash
eas submit --platform ios --path builds/<file>.ipa       # → TestFlight
eas submit --platform android --path builds/<file>.aab   # → Play Console
```

Remind them of anything still needed before release: Firestore rules changes deployed (`firebase deploy --only firestore:rules`) before the build reaches members, and that each build used up a build number on EAS (gaps are normal).
