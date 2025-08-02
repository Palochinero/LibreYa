export default {
  expo: {
    name: "PlazaLibre",
    slug: "plazalibre",

    android: {
      newArchEnabled: false,
      package: "com.palochinero.plazalibre",
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "RECORD_AUDIO"
      ]
    },
    ios: {
      newArchEnabled: false,
      bundleIdentifier: "com.palochinero.plazalibre",
      infoPlist: {
        NSCameraUsageDescription: "Esta app necesita acceso a la cámara para tomar fotos de verificación de plazas de aparcamiento.",
        NSLocationWhenInUseUsageDescription: "Esta app necesita acceso a tu ubicación para mostrar plazas de aparcamiento cercanas.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "Esta app necesita acceso a tu ubicación para mostrar plazas de aparcamiento cercanas.",
        NSPhotoLibraryUsageDescription: "Esta app necesita acceso a tu galería para seleccionar fotos de verificación."
      }
    },

    plugins: [
      [
        "expo-camera",
        {
          cameraPermission: "Permitir a PlazaLibre acceder a tu cámara para tomar fotos de verificación."
        }
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Permitir a PlazaLibre acceder a tu ubicación para mostrar plazas cercanas."
        }
      ],
      [
        "expo-notifications",
        {
          icon: "./src/assets/notification-icon.png",
          color: "#ffffff"
        }
      ],
      [
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme: "com.googleusercontent.apps.13007497972-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
        }
      ]
    ],

    extra: {
      eas: {
        projectId: "cc6982cd-c596-431c-b810-88258b370cf7"
      }
    }
  }
};
