const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Theme.App.SplashScreen parents Theme.SplashScreen from
 * androidx.core:core-splashscreen. That library is only an
 * `implementation` dep of expo-splash-screen, so the app module
 * does not see its resources during linking — add it explicitly.
 */
function withAndroidSplashScreenDependency(config) {
  return withAppBuildGradle(config, (config) => {
    const marker = 'androidx.core:core-splashscreen';
    if (config.modResults.contents.includes(marker)) {
      return config;
    }

    config.modResults.contents = config.modResults.contents.replace(
      /dependencies\s*\{/,
      `dependencies {
    implementation("androidx.core:core-splashscreen:1.2.0")`,
    );
    return config;
  });
}

module.exports = withAndroidSplashScreenDependency;
