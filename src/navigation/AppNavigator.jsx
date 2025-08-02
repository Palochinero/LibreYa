import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Screens
import LoginScreen from '../screens/LoginScreen';
import MapScreen from '../screens/MapScreen';
import FindParkingScreen from '../screens/FindParkingScreen';
import OfferParkingScreen from '../screens/OfferParkingScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatScreen from '../screens/ChatScreen';
import FaqScreen from '../screens/FaqScreen';
import ReservationDetailScreen from '../screens/ReservationDetailScreen';
import TrackingScreen from '../screens/TrackingScreen';
import AnonymousReportScreen from '../screens/AnonymousReportScreen';

// Context
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'FindParking') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'OfferParking') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTintColor: colors.text,
      })}
    >
      <Tab.Screen 
        name="Map" 
        component={MapScreen}
        options={{ title: 'Mapa' }}
      />
      <Tab.Screen 
        name="FindParking" 
        component={FindParkingScreen}
        options={{ title: 'Buscar Plaza' }}
      />
      <Tab.Screen 
        name="OfferParking" 
        component={OfferParkingScreen}
        options={{ title: 'Ofrecer Plaza' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Perfil' }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user } = useAuth();
  const { colors } = useTheme();

  if (!user) {
    return (
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: colors.card,
            },
            headerTintColor: colors.text,
          }}
        >
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.card,
          },
          headerTintColor: colors.text,
        }}
      >
        <Stack.Screen 
          name="Main" 
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Chat" 
          component={ChatScreen}
          options={{ title: 'Chat' }}
        />
        <Stack.Screen 
          name="Faq" 
          component={FaqScreen}
          options={{ title: 'Preguntas Frecuentes' }}
        />
        <Stack.Screen 
          name="ReservationDetail" 
          component={ReservationDetailScreen}
          options={{ title: 'Detalles de Reserva' }}
        />
        <Stack.Screen 
          name="Tracking" 
          component={TrackingScreen}
          options={{ title: 'Seguimiento en Tiempo Real' }}
        />
        <Stack.Screen 
          name="AnonymousReport" 
          component={AnonymousReportScreen}
          options={{ title: 'Reportar Incidente' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 