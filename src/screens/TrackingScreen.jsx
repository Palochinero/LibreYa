import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/firebase';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

const TrackingScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [trackingInfo, setTrackingInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const mapRef = useRef(null);
  const locationSubscription = useRef(null);

  const { spaceId, spaceData } = route.params || {};

  useEffect(() => {
    if (spaceId) {
      loadTrackingInfo();
      startLocationTracking();
    }

    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, [spaceId]);

  const loadTrackingInfo = async () => {
    try {
      setLoading(true);
      const result = await api.getTrackingInfo({ spaceId });
      setTrackingInfo(result.data.trackingInfo);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar la información de seguimiento');
    } finally {
      setLoading(false);
    }
  };

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos', 'Se necesita permiso de ubicación para el seguimiento');
        return;
      }

      // Obtener ubicación inicial
      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Iniciar seguimiento en tiempo real
      locationSubscription.current = Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // Actualizar cada 10 segundos
          distanceInterval: 50, // Actualizar cada 50 metros
        },
        (location) => {
          const newLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setUserLocation(newLocation);
          
          // Si el usuario es el conductor, actualizar su ubicación
          if (spaceData?.takerId === user.uid) {
            updateDriverLocation(newLocation);
          }
        }
      );

      setIsTracking(true);
    } catch (error) {
      console.error('Error iniciando seguimiento:', error);
    }
  };

  const updateDriverLocation = async (location) => {
    try {
      // Determinar el estado basado en la distancia
      let status = 'en_camino';
      if (trackingInfo?.distanceToDestination) {
        if (trackingInfo.distanceToDestination < 0.5) {
          status = 'llegando';
        } else if (trackingInfo.distanceToDestination < 2) {
          status = 'cerca';
        }
      }

      await api.trackParkingSpace({
        spaceId,
        latitude: location.latitude,
        longitude: location.longitude,
        status,
      });

      // Recargar información de seguimiento
      loadTrackingInfo();
    } catch (error) {
      console.error('Error actualizando ubicación:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'en_camino': return '#ffa726';
      case 'cerca': return '#ff9800';
      case 'llegando': return '#4caf50';
      case 'llegado': return '#2e7d32';
      default: return colors.primary;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'en_camino': return 'En camino';
      case 'cerca': return 'Cerca del destino';
      case 'llegando': return 'Llegando';
      case 'llegado': return 'Ha llegado';
      default: return 'Desconocido';
    }
  };

  const formatTimeRemaining = (minutes) => {
    if (minutes <= 0) return 'Llegando ahora';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Cargando seguimiento...
        </Text>
      </View>
    );
  }

  if (!trackingInfo) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>
          No hay información de seguimiento disponible
        </Text>
      </View>
    );
  }

  const isDriver = spaceData?.takerId === user.uid;
  const isProvider = spaceData?.providerId === user.uid;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Seguimiento en Tiempo Real
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Mapa */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: trackingInfo.providerLocation.latitude,
            longitude: trackingInfo.providerLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          {/* Marcador del proveedor (plaza) */}
          <Marker
            coordinate={{
              latitude: trackingInfo.providerLocation.latitude,
              longitude: trackingInfo.providerLocation.longitude,
            }}
            title="Plaza de Aparcamiento"
            description={trackingInfo.providerLocation.address}
            pinColor={colors.primary}
          />

          {/* Marcador del conductor */}
          {trackingInfo.takerLocation && (
            <Marker
              coordinate={{
                latitude: trackingInfo.takerLocation.latitude,
                longitude: trackingInfo.takerLocation.longitude,
              }}
              title="Conductor"
              description={getStatusText(trackingInfo.takerLocation.status)}
              pinColor={getStatusColor(trackingInfo.takerLocation.status)}
            />
          )}

          {/* Línea de ruta */}
          {trackingInfo.takerLocation && (
            <Polyline
              coordinates={[
                {
                  latitude: trackingInfo.takerLocation.latitude,
                  longitude: trackingInfo.takerLocation.longitude,
                },
                {
                  latitude: trackingInfo.providerLocation.latitude,
                  longitude: trackingInfo.providerLocation.longitude,
                },
              ]}
              strokeColor={colors.primary}
              strokeWidth={3}
            />
          )}
        </MapView>
      </View>

      {/* Información de seguimiento */}
      <View style={[styles.infoContainer, { backgroundColor: colors.card }]}>
        <View style={styles.infoRow}>
          <Ionicons name="location" size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.text }]}>
            {trackingInfo.providerLocation.address}
          </Text>
        </View>

        {trackingInfo.takerLocation && (
          <>
            <View style={styles.infoRow}>
              <Ionicons name="car" size={20} color={getStatusColor(trackingInfo.takerLocation.status)} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                {getStatusText(trackingInfo.takerLocation.status)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="time" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                Distancia: {trackingInfo.takerLocation.distance.toFixed(1)} km
              </Text>
            </View>

            {trackingInfo.timeRemaining !== undefined && (
              <View style={styles.infoRow}>
                <Ionicons name="timer" size={20} color={colors.secondary} />
                <Text style={[styles.infoText, { color: colors.text }]}>
                  Tiempo restante: {formatTimeRemaining(trackingInfo.timeRemaining)}
                </Text>
              </View>
            )}
          </>
        )}

        {/* Botones de acción */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Chat', { spaceId, spaceData })}
          >
            <Ionicons name="chatbubble" size={20} color="white" />
            <Text style={styles.actionButtonText}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.secondary }]}
            onPress={loadTrackingInfo}
          >
            <Ionicons name="refresh" size={20} color="white" />
            <Text style={styles.actionButtonText}>Actualizar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  mapContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  infoContainer: {
    padding: 20,
    margin: 16,
    borderRadius: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
});

export default TrackingScreen; 