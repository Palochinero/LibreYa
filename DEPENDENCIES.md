# Dependencias de Plaza Libre

## Dependencias Principales

### 🧭 Navegación
- **@react-navigation/native**: Navegación principal
- **@react-navigation/bottom-tabs**: Menú de pestañas inferior
- **@react-navigation/stack**: Navegación en stack
- **react-native-screens**: Optimización de rendimiento nativo
- **react-native-safe-area-context**: Manejo de áreas seguras
- **react-native-gesture-handler**: Gestos de navegación

### 🔥 Firebase
- **firebase**: SDK v12 modular para autenticación, Firestore, Storage y Cloud Functions

### 📍 Geolocalización
- **expo-location**: Acceso a GPS del dispositivo
- **react-native-maps**: Mapas nativos (Google Maps/Apple Maps)

### 📱 Notificaciones
- **expo-notifications**: Notificaciones push en tiempo real
- **expo-device**: Información del dispositivo para notificaciones

### 📸 Cámara y Media
- **expo-camera**: Acceso a cámara para fotos de verificación
- **expo-image-picker**: Selección de imágenes de galería

### 🎨 UI/UX
- **react-native-paper**: Componentes Material Design
- **@expo/vector-icons**: Iconos (Ionicons, Material Icons, etc.)
- **react-native-toast-message**: Notificaciones toast
- **react-native-gifted-chat**: Chat UI para coordinación

### 📅 Utilidades
- **date-fns**: Manejo de fechas y horas
- **@react-native-async-storage/async-storage**: Almacenamiento local
- **@react-native-community/netinfo**: Detección de conexión
- **@react-native-community/datetimepicker**: Selector de fecha/hora

### 🔧 Desarrollo
- **expo-dev-client**: Cliente de desarrollo
- **expo-constants**: Constantes de configuración
- **@expo/config-plugins**: Plugins de configuración

## Dependencias de Desarrollo

### 🧪 Testing
- **jest**: Framework de testing
- **jest-expo**: Configuración Jest para Expo
- **@testing-library/react-native**: Testing de componentes

### 🔍 Linting y TypeScript
- **typescript**: Tipado estático
- **eslint**: Linter de código
- **@typescript-eslint/eslint-plugin**: Reglas ESLint para TypeScript
- **@typescript-eslint/parser**: Parser TypeScript para ESLint
- **eslint-plugin-react**: Reglas ESLint para React
- **eslint-plugin-react-hooks**: Reglas para React Hooks

## Configuraciones

### Permisos Android
- `ACCESS_FINE_LOCATION`: GPS preciso
- `ACCESS_COARSE_LOCATION`: GPS aproximado
- `CAMERA`: Acceso a cámara
- `READ_EXTERNAL_STORAGE`: Lectura de galería
- `WRITE_EXTERNAL_STORAGE`: Escritura de archivos
- `RECORD_AUDIO`: Audio para chat (futuro)

### Permisos iOS
- `NSCameraUsageDescription`: Descripción para cámara
- `NSLocationWhenInUseUsageDescription`: Descripción para ubicación
- `NSPhotoLibraryUsageDescription`: Descripción para galería

## Scripts Disponibles

```bash
# Desarrollo
npm start          # Iniciar servidor de desarrollo
npm run android    # Ejecutar en Android
npm run ios        # Ejecutar en iOS
npm run web        # Ejecutar en web

# Testing
npm test           # Ejecutar tests
npm run lint       # Linting del código

# Build
expo build:android # Build para Android
expo build:ios     # Build para iOS
```

## Funcionalidades Implementadas

### ✅ Completadas
- [x] Navegación con tabs y stack
- [x] Autenticación Firebase
- [x] Geolocalización y mapas
- [x] Notificaciones push
- [x] Chat entre usuarios
- [x] Cámara para verificación
- [x] UI con Material Design
- [x] Testing y linting
- [x] TypeScript completo

### 🚧 En Desarrollo
- [ ] Integración con Sentry (monitoreo)
- [ ] Offline mode completo
- [ ] Tests unitarios
- [ ] Tests de integración

## Notas Importantes

1. **Google Maps API Key**: Necesaria para Android. Configurar en `app.config.js`
2. **Firebase Config**: Ya configurado en `src/api/firebase.js`
3. **Expo Notifications**: Requiere configuración en EAS Build
4. **Testing**: Configurado con Jest y React Native Testing Library
5. **Linting**: Configurado con ESLint y TypeScript

## Próximos Pasos

1. Instalar dependencias: `npm install`
2. Configurar Google Maps API Key
3. Configurar Sentry para monitoreo
4. Implementar tests unitarios
5. Configurar CI/CD con GitHub Actions 