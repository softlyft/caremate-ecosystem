const { withAndroidManifest } = require('expo/config-plugins');

const PERMISSION = 'android.permission.SYSTEM_ALERT_WINDOW';

/**
 * Strip SYSTEM_ALERT_WINDOW from the main/release Android manifest.
 * Debug / debugOptimized still declare it for the RN / Expo overlay.
 * `tools:node="remove"` blocks libraries from merging it back into release.
 */
function withRemoveSystemAlertWindow(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest.$ = manifest.$ ?? {};
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    const existing = manifest['uses-permission'] ?? [];
    const without = existing.filter((entry) => entry?.$?.['android:name'] !== PERMISSION);

    without.push({
      $: {
        'android:name': PERMISSION,
        'tools:node': 'remove',
      },
    });

    manifest['uses-permission'] = without;
    return config;
  });
}

module.exports = withRemoveSystemAlertWindow;
