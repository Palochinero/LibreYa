// FindParkingScreen.jsx - VERSIÓN FINAL Y 100% CORREGIDA

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';
import MapView from 'react-native-maps';

import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext'; // ¡¡¡LA LÍNEA QUE FALTABA!!!
import { api } from '../api/firebase';

const FindParkingScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth(); // Ahora sí podemos usarlo

  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('Encuentra la plaza más cercana con un solo toque.');
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleFindAndAssign = async () => {
    if (!user) {
        Toast.show({type: 'error', text1: 'Error', text2: 'Debes iniciar sesión para buscar.'});
        return;
    }
    setIsLoading(true);
    setStatusText('Obteniendo tu ubicación...');

    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({ type: 'error', text1: 'Permiso Denegado', text2: 'Necesitamos tu ubicación para buscar.' });
      setIsLoading(false);
      return;
    }

    try {
      let currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setStatusText('Buscando plazas disponibles...');

      const result = await api.findAndAssignParkingSpace({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      if (result.data.parkingSpaceId) {
        setStatusText('¡Plaza asignada! Redirigiendo...');
        Toast.show({ type: 'success', text1: '¡Plaza encontrada!', text2: 'Se te ha asignado la plaza más cercana.' });
        
        navigation.navigate('ReservationDetail', { parkingSpaceId: result.data.parkingSpaceId });
      }

    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Búsqueda fallida', text2: error.message || 'No hay plazas cerca o ya fue reservada.' });
    } finally {
      setIsLoading(false);
      setStatusText('Encuentra la plaza más cercana con un solo toque.');
    }
  };
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <MapView
          style={StyleSheet.absoluteFillObject}
          provider={MapView.PROVIDER_GOOGLE}
          initialRegion={{
              latitude: 40.416775,
              longitude: -3.703790,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
          }}
          showsUserLocation={true}
          customMapStyle={mapStyle}
      />
      <View style={styles.overlay}>
        <Text style={[styles.statusText, { color: colors.text }]}>{statusText}</Text>
        
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity 
            style={[styles.mainButton, { backgroundColor: colors.primary }]} 
            onPress={handleFindAndAssign} 
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" size="large" />
            ) : (
              <Ionicons name="search" size={50} color="white" />
            )}
          </TouchableOpacity>
        </Animated.View>

        <Text style={[styles.buttonLabel, { color: colors.text }]}>BUSCAR PLAZA AHORA</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    padding: 20,
  },
  statusText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
    fontWeight: '600',
  },
  mainButton: {
    width: 150,
    height: 150,
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  buttonLabel: {
    marginTop: 20,
    fontSize: 22,
    fontWeight: 'bold',
  },
});

const mapStyle = [ { "featureType": "poi", "stylers": [ { "visibility": "off" } ] } ];

export default FindParkingScreen;