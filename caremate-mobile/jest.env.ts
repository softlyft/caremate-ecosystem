// Run before jest-expo preset so Expo keeps React Native's fetch instead of lazy-loading
// expo/src/winter/fetch after tests finish (which triggers "Cannot log after tests are done").
process.env.EXPO_PUBLIC_USE_RN_FETCH = '1';
