// App.js  (raíz)
import React from 'react';
import { StatusBar } from 'expo-status-bar';

// ⬇️  ruta relativa correcta:
import AppNavigator from './plazalibre-app/src/navigation/AppNavigator';

export default function App() {
  return (
    <>
      <AppNavigator />
      <StatusBar style="auto" />
    </>
  );
}
