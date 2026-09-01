#!/usr/bin/env node
/**
 * Ensure android/app/build.gradle uses CARE_MATE_UPLOAD_* for release signing.
 * Used by Android Play CI after `expo prebuild` so Play uploads never ship
 * debug-signed AABs even if the Expo config plugin was missing on the branch.
 */
const fs = require('fs');
const path = require('path');

const gradlePath = path.resolve(__dirname, '..', 'android', 'app', 'build.gradle');

if (!fs.existsSync(gradlePath)) {
  console.error(`Missing ${gradlePath}. Run expo prebuild first.`);
  process.exit(1);
}

let src = fs.readFileSync(gradlePath, 'utf8');

if (src.includes('CARE_MATE_UPLOAD_STORE_FILE')) {
  console.log('Release signing already configured in app/build.gradle');
  process.exit(0);
}

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

if (!src.includes(DEBUG_SIGNING_CONFIG)) {
  console.error('Could not find debug signingConfigs block in app/build.gradle');
  process.exit(1);
}
if (!src.includes(DEBUG_RELEASE_SIGNING)) {
  console.error('Could not find debug release signingConfig in app/build.gradle');
  process.exit(1);
}

src = src.replace(DEBUG_SIGNING_CONFIG, SIGNING_CONFIGS);
src = src.replace(DEBUG_RELEASE_SIGNING, CONDITIONAL_RELEASE_SIGNING);
fs.writeFileSync(gradlePath, src);
console.log('Patched app/build.gradle for CARE_MATE_UPLOAD_* release signing');
