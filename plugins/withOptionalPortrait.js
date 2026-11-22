const { withAndroidManifest } = require('expo/config-plugins');

/**
 * `orientation: "portrait"` makes Android treat a portrait screen as a
 * required hardware feature, so Google Play hides the app from devices that
 * don't report one (some Chromebooks, desktops, XR headsets). Keep the
 * portrait lock but declare the feature optional.
 */
const FEATURE = 'android.hardware.screen.portrait';

module.exports = function withOptionalPortrait(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const features = (manifest['uses-feature'] ??= []);
    const existing = features.find((f) => f.$?.['android:name'] === FEATURE);
    if (existing) existing.$['android:required'] = 'false';
    else features.push({ $: { 'android:name': FEATURE, 'android:required': 'false' } });
    return cfg;
  });
};
