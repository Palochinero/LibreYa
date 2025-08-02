import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../api/firebase';

const ReservationDetailScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const { spaceId } = route.params || {};

  useEffect(() => {
    if (spaceId) {
      loadReservationDetails();
    }
  }, [spaceId]);

  const loadReservationDetails = async () => {
    try {
      const spaceRef = doc(db, 'parkingSpaces', spaceId);
      const spaceSnap = await getDoc(spaceRef);
      
      if (spaceSnap.exists()) {
        setReservation({ id: spaceSnap.id, ...spaceSnap.data() });
      } else {
        Alert.alert('Error', 'No se encontró la reserva');
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar los detalles');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = async () => {
    Alert.alert(
      'Cancelar Reserva',
      '¿Estás seguro de que quieres cancelar esta reserva?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await api.cancelParkingSpace({ spaceId });
              Alert.alert('Éxito', 'Reserva cancelada correctamente');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', error.message || 'No se pudo cancelar la reserva');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleCompleteReservation = async () => {
    Alert.alert(
      'Completar Reserva',
      '¿Confirmas que has completado el uso de la plaza?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, completar',
          onPress: async () => {
            setActionLoading(true);
            try {
              await api.completeParkingSpace({ spaceId });
              Alert.alert('Éxito', 'Reserva completada correctamente');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', error.message || 'No se pudo completar la reserva');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const openChat = () => {
    navigation.navigate('Chat', { 
      spaceId, 
      spaceData: reservation 
    });
  };

  const openMaps = () => {
    if (reservation?.latitude && reservation?.longitude) {
      const url = `https://maps.google.com/?q=${reservation.latitude},${reservation.longitude}`;
      Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!reservation) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>
          No se encontró la reserva
        </Text>
      </View>
    );
  }

  const isProvider = reservation.providerId === user.uid;
  const isTaker = reservation.takerId === user.uid;
  const canCancel = isProvider && reservation.status === 'reservada';
  const canComplete = isTaker && reservation.status === 'reservada';

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(reservation.status, colors) }
          ]}>
            <Text style={styles.statusText}>
              {getStatusText(reservation.status)}
            </Text>
          </View>
        </View>
        
        <Text style={[styles.title, { color: colors.text }]}>
          Plaza de Estacionamiento
        </Text>
        <Text style={[styles.address, { color: colors.inactive }]}>
          {reservation.address}
        </Text>
      </View>

      {/* Details */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Detalles de la Reserva
        </Text>
        
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={20} color={colors.inactive} />
          <Text style={[styles.detailText, { color: colors.text }]}>
            {reservation.startTime?.toDate?.()?.toLocaleString() || 'No especificado'}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={20} color={colors.inactive} />
          <Text style={[styles.detailText, { color: colors.text }]}>
            {reservation.price}€ / hora
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={20} color={colors.inactive} />
          <Text style={[styles.detailText, { color: colors.text }]}>
            {isProvider ? 'Eres el proveedor' : 'Eres el conductor'}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Acciones
        </Text>
        
        <TouchableOpacity 
          style={[styles.actionButton, { borderColor: colors.border }]}
          onPress={openMaps}
        >
          <Ionicons name="map-outline" size={24} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>
            Ver en Mapa
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, { borderColor: colors.border }]}
          onPress={openChat}
        >
          <Ionicons name="chatbubble-outline" size={24} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>
            Abrir Chat
          </Text>
        </TouchableOpacity>
        
        {/* Botón de seguimiento en tiempo real (solo para plazas instantáneas) */}
        {!reservation.isScheduled && reservation.status === 'reservada' && (
          <TouchableOpacity 
            style={[styles.actionButton, { borderColor: colors.secondary }]}
            onPress={() => navigation.navigate('Tracking', { 
              spaceId, 
              spaceData: reservation 
            })}
          >
            <Ionicons name="location-outline" size={24} color={colors.secondary} />
            <Text style={[styles.actionText, { color: colors.secondary }]}>
              Seguimiento en Tiempo Real
            </Text>
          </TouchableOpacity>
        )}
        
        {canCancel && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.dangerButton, { borderColor: '#ff4444' }]}
            onPress={handleCancelReservation}
            disabled={actionLoading}
          >
            <Ionicons name="close-circle-outline" size={24} color="#ff4444" />
            <Text style={[styles.actionText, { color: '#ff4444' }]}>
              {actionLoading ? 'Cancelando...' : 'Cancelar Reserva'}
            </Text>
          </TouchableOpacity>
        )}
        
        {canComplete && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.successButton, { borderColor: colors.secondary }]}
            onPress={handleCompleteReservation}
            disabled={actionLoading}
          >
            <Ionicons name="checkmark-circle-outline" size={24} color={colors.secondary} />
            <Text style={[styles.actionText, { color: colors.secondary }]}>
              {actionLoading ? 'Completando...' : 'Completar Reserva'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const getStatusColor = (status, colors) => {
  switch (status) {
    case 'pendiente': return '#ffa726';
    case 'reservada': return colors.primary;
    case 'completada': return colors.secondary;
    case 'cancelada': return '#ff4444';
    default: return colors.inactive;
  }
};

const getStatusText = (status) => {
  switch (status) {
    case 'pendiente': return 'Pendiente';
    case 'reservada': return 'Reservada';
    case 'completada': return 'Completada';
    case 'cancelada': return 'Cancelada';
    default: return 'Desconocido';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    marginBottom: 16,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  address: {
    fontSize: 16,
    textAlign: 'center',
  },
  section: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 16,
    marginLeft: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  dangerButton: {
    borderColor: '#ff4444',
  },
  successButton: {
    borderColor: '#28a745',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
});

export default ReservationDetailScreen;