module.exports = {
  expo: {
    name: "Whisppr",
    slug: "whisppr-demo",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    splash: {
      resizeMode: "contain",
      backgroundColor: "#DC2626"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.whisppr.demo",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "Whisppr needs your location to send emergency alerts with your coordinates.",
        NSLocationAlwaysUsageDescription: "Whisppr needs your location to send emergency alerts even when the app is in the background."
      }
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#DC2626"
      },
      package: "com.whisppr.demo",
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ]
    },
    web: {},
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000",
      apiKey: process.env.EXPO_PUBLIC_API_KEY || "demo-secret-key"
    }
  }
};
