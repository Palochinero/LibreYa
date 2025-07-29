// AppNavigator.js - Versión Final y Corregida

import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext'; // Importamos el hook de Tema

// --- Importamos TODAS las pantallas ---
import FindParkingScreen from '../screens/FindParkingScreen'; // ¡LA NUEVA PANTALLA PRINCIPAL!
import OfferParkingScreen from '../screens/OfferParkingScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LoginScreen from '../screens/LoginScreen';
import ReservationDetailScreen from '../screens/ReservationDetailScreen';
import ChatScreen from '../screens/ChatScreen';
import FaqScreen from '../screens/FaqScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// --- Grupo de Autenticación ---
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

// --- Grupo Principal con Pestañas Inferiores (Tabs) ---
function MainTabs() {
  const { colors } = useTheme(); // Obtenemos los colores del tema actual

  return (
    <Tab.Navigator
      // --- OPCIONES DE DISEÑO PARA LA BARRA DE PESTAÑAS ---
      screenOptions={({ route }) => ({
        headerShown: false, // Ocultamos el título duplicado de la pestaña
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Buscar') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Ofrecer Plaza') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Mi Perfil') {
            iconName = focused ? 'person-circle' : 'person-circle-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary, // Color para la pestaña activa (del tema)
        tabBarInactiveTintColor: colors.inactive, // Color para las inactivas
        tabBarStyle: {
          backgroundColor: colors.card, // Color de fondo de la barra (del tema)
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontWeight: 'bold',
        }
      })}
    >
      {/* Las 3 pestañas principales de la app */}
      <Tab.Screen name="Buscar" component={FindParkingScreen} />
      <Tab.Screen name="Ofrecer Plaza" component={OfferParkingScreen} />
      <Tab.Screen name="Mi Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// --- Navegador Principal ---
export default function AppNavigator() {
  const { user, loading } = useAuth();
  const { colors } = useTheme(); // Colores para las barras de navegación de Stack

  // Pantalla de carga inicial mientras se comprueba la sesión
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary}/>
      </View>
    );
  }

  return (
    // El NavigationContainer ahora usa los colores del tema para la app
    <NavigationContainer theme={{
        dark: colors.background === '#121212',
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.card,
          text: colors.text,
          border: colors.border,
          notification: colors.primary,
        },
      }}>
      <Stack.Navigator>
        {user ? (
          // Si el usuario ha iniciado sesión
          <>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="ReservationDetail" component={ReservationDetailScreen} options={{ title: 'Detalles de la Reserva' }} />
            <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat de Coordinación' }} />
            <Stack.Screen name="Faq" component={FaqScreen} options={{ title: 'Preguntas Frecuentes' }} />
          </>
        ) : (
          // Si el usuario NO ha iniciado sesión
          <Stack.Screen name="Auth" component={AuthStack} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}