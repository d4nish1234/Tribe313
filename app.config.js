const IS_DEV = process.env.APP_VARIANT === "development";

export default {
  expo: {
    name: IS_DEV ? "Tribe313 (Dev)" : "Tribe313",
    slug: "tribe313",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "tribe313",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    updates: {
      url: `https://u.expo.dev/${process.env.EAS_PROJECT_ID || "2ca8a19b-c0b7-4bc3-bf92-ac0e0f970331"}`,
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: IS_DEV ? "com.tribe313.app.dev" : "com.tribe313.app",
      config: {
        usesNonExemptEncryption: false,
      },
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "Tribe313 uses your location to show directions to events and ride pickups.",
      },
    },
    android: {
      package: IS_DEV ? "com.tribe313.app.dev" : "com.tribe313.app",
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Tribe313 uses your location to show directions to events and ride pickups.",
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/images/icon.png",
          color: "#ffffff",
        },
      ],
      "@react-native-community/datetimepicker",
    ],
    extra: {
      eas: {
        projectId: process.env.EAS_PROJECT_ID || "2ca8a19b-c0b7-4bc3-bf92-ac0e0f970331",
      },
      firebase: {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
      },
    },
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  },
};
