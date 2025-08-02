// FindParkingScreen.jsx - VERSIÓN FINAL Y 100% CORREGIDA

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Alert } from 'react-native';
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
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityInfo, setAvailabilityInfo] = useState(null);
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

  // Verificar disponibilidad de plazas en la zona
  const checkAvailability = async () => {
    if (!user) {
      Toast.show({type: 'error', text1: 'Error', text2: 'Debes iniciar sesión para buscar.'});
      return;
    }

    setIsCheckingAvailability(true);
    setStatusText('Verificando disponibilidad en tu zona...');

    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({ type: 'error', text1: 'Permiso Denegado', text2: 'Necesitamos tu ubicación para verificar disponibilidad.' });
      setIsCheckingAvailability(false);
      return;
    }

    try {
      let currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      
      const result = await api.checkParkingAvailability({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        radius: 1000 // 1km de radio
      });

      setAvailabilityInfo(result.data);
      
      if (result.data.availableSpaces > 0) {
        setStatusText(`¡Hay ${result.data.availableSpaces} plaza(s) disponible(s) cerca de ti!`);
        Toast.show({ 
          type: 'success', 
          text1: 'Plazas disponibles', 
          text2: `${result.data.availableSpaces} plaza(s) encontrada(s) en un radio de 1km` 
        });
      } else {
        setStatusText('No hay plazas disponibles en tu zona en este momento.');
        Toast.show({ 
          type: 'info', 
          text1: 'Sin plazas disponibles', 
          text2: 'No hay plazas libres en un radio de 1km de tu ubicación' 
        });
      }

    } catch (error) {
      console.error('Error checking availability:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo verificar la disponibilidad.' });
      setAvailabilityInfo(null);
    } finally {
      setIsCheckingAvailability(false);
    }
  };

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
        
        {/* Información de disponibilidad */}
        {availabilityInfo && (
          <View style={[styles.availabilityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.availabilityTitle, { color: colors.text }]}>
              Disponibilidad en tu zona
            </Text>
            <Text style={[styles.availabilityText, { color: colors.text }]}>
              {availabilityInfo.availableSpaces > 0 
                ? `${availabilityInfo.availableSpaces} plaza(s) disponible(s) en un radio de 1km`
                : 'No hay plazas disponibles en tu zona'
              }
            </Text>
            {availabilityInfo.spacesInRange && availabilityInfo.spacesInRange.length > 0 && (
              <Text style={[styles.availabilityDetails, { color: colors.inactive }]}>
                La más cercana a {availabilityInfo.spacesInRange[0].distance}m
              </Text>
            )}
          </View>
        )}

        {/* Botón de verificar disponibilidad */}
        <TouchableOpacity 
          style={[styles.checkButton, { backgroundColor: colors.secondary }]} 
          onPress={checkAvailability}
          disabled={isCheckingAvailability}
        >
          {isCheckingAvailability ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Ionicons name="location-outline" size={20} color="white" />
              <Text style={styles.checkButtonText}>Verificar Disponibilidad</Text>
            </>
          )}
        </TouchableOpacity>

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
  availabilityCard: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  availabilityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  availabilityText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 5,
  },
  availabilityDetails: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  checkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 30,
  },
  checkButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
});

const mapStyle = [ { "featureType": "poi", "stylers": [ { "visibility": "off" } ] } ];

export default FindParkingScreen;