module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./src/assets/fonts'],
  dependencies: {
    'react-native-onesignal': {
      platforms: {
        android: null,
        ios: null,
      },
    },
    'rn-fetch-blob': {
      platforms: {
        ios: null,
      },
    },
  },
};