// firebase.js - Versión Final, Limpia y Unificada

// -----------------------------------------------------------------------------
// 1. IMPORTAMOS LAS HERRAMIENTAS DE FIREBASE
// -----------------------------------------------------------------------------
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

// -----------------------------------------------------------------------------
// 2. CONFIGURACIÓN DE TU PROYECTO (TUS "LLAVES")
// -----------------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyCZg3sy5BodpJyS0db9o6v0ghaSvx7UnuU",
  authDomain: "plaza-libre-god.firebaseapp.com",
  projectId: "plaza-libre-god",
  storageBucket: "plaza-libre-god.firebasestorage.app",
  messagingSenderId: "13007497972",
  appId: "1:13007497972:web:e63285df35d3f747248ca1"
};

// -----------------------------------------------------------------------------
// 3. INICIALIZAMOS LOS SERVICIOS DE FIREBASE
// -----------------------------------------------------------------------------
const app = initializeApp(firebaseConfig);

// Inicializamos Auth con la "cajonera" para guardar la sesión
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app, 'us-central1'); // ✅ CORRECTO

// -----------------------------------------------------------------------------
// 4. PREPARAMOS LOS ATAJOS PARA LLAMAR AL BACKEND
// -----------------------------------------------------------------------------
const callFunction = (functionName) => httpsCallable(functions, functionName);

// ¡¡AQUÍ ESTÁ EL ARREGLO!!
// Creamos UNA SOLA "caja de herramientas" api con TODAS las funciones.
export const api = {
  publishParkingSpace: (data) => callFunction('publishParkingSpace')(data),
  reserveParkingSpace: (data) => callFunction('reserveParkingSpace')(data),
  completeParkingSpace: (data) => callFunction('completeParkingSpace')(data),
  findAndAssignParkingSpace: (data) => callFunction('findAndAssignParkingSpace')(data),
  deleteParkingSpace  : (data) => callFunction('deleteParkingSpace')(data),
  cancelParkingSpace  : (data) => callFunction('cancelParkingSpace')(data),
};

// -----------------------------------------------------------------------------
// 5. EXPORTAMOS LOS SERVICIOS PARA QUE EL RESTO DE LA APP PUEDA USARLOS
// -----------------------------------------------------------------------------
export { auth, db, storage };