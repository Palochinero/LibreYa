export default {
  expo: {
    name: "PlazaLibre",
    slug: "plazalibre",
    sdkVersion: "53.0.0",

    android: {
      newArchEnabled: false,
      package: "com.palochinero.plazalibre"   // ←  ID ÚNICO
    },
    ios: {
      newArchEnabled: false,
      bundleIdentifier: "com.palochinero.plazalibre" // (opcional para ahora)
    },

    extra: {
      eas: {
        projectId: "cc6982cd-c596-431c-b810-88258b370cf7"
      }
    }
  }
};
