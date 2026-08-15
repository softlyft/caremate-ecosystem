const { withAppBuildGradle } = require('expo/config-plugins');

const DEBUG_SIGNING_CONFIG = `debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }`;

const SIGNING_CONFIGS = `debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (project.hasProperty('CARE_MATE_UPLOAD_STORE_FILE')) {
                storeFile rootProject.file(CARE_MATE_UPLOAD_STORE_FILE)
                storePassword CARE_MATE_UPLOAD_STORE_PASSWORD
                keyAlias CARE_MATE_UPLOAD_KEY_ALIAS
                keyPassword CARE_MATE_UPLOAD_KEY_PASSWORD
            }
        }`;

const DEBUG_RELEASE_SIGNING = `// Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`;

const CONDITIONAL_RELEASE_SIGNING = `signingConfig project.hasProperty('CARE_MATE_UPLOAD_STORE_FILE')
                ? signingConfigs.release
                : signingConfigs.debug`;

/**
 * Use a Play upload keystore for release when Gradle properties are present.
 * Local `assembleRelease` without those properties still signs with the debug key.
 */
function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let src = config.modResults.contents;

    if (src.includes('CARE_MATE_UPLOAD_STORE_FILE')) {
      return config;
    }

    if (!src.includes(DEBUG_SIGNING_CONFIG)) {
      throw new Error(
        'withAndroidReleaseSigning: could not find debug signingConfigs block in app/build.gradle',
      );
    }
    if (!src.includes(DEBUG_RELEASE_SIGNING)) {
      throw new Error(
        'withAndroidReleaseSigning: could not find debug release signingConfig in app/build.gradle',
      );
    }

    src = src.replace(DEBUG_SIGNING_CONFIG, SIGNING_CONFIGS);
    src = src.replace(DEBUG_RELEASE_SIGNING, CONDITIONAL_RELEASE_SIGNING);
    config.modResults.contents = src;
    return config;
  });
}

module.exports = withAndroidReleaseSigning;
