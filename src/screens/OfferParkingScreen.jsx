// OfferParkingScreen.jsx – versión limpia y consolidada ✅
// Copia TODO este archivo y reemplaza el tuyo para evitar duplicados o llaves sin cerrar.

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';

import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { db, api } from '../api/firebase';

/*──────────────────────── COMPONENTE PLAZA ACTIVA ────────────────────────*/
const ActiveSpotStatus = ({ spot, onCancel, onDelete }) => {
  const { colors } = useTheme();
  const isPending = spot.status === 'pendiente';
  const isReserved = spot.status === 'reservada';

  return (
    <View style={[styles.statusContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons name="checkmark-circle" size={46} color={colors.secondary} />
      <Text style={[styles.statusTitle, { color: colors.text }]}>Tienes una plaza activa</Text>
      <Text style={[styles.statusInfo, { color: colors.text }]}>{spot.description}</Text>
      <View style={[styles.statusBadge, isReserved && { backgroundColor: colors.primary }]}>
        <Text style={styles.statusBadgeText}>{spot.status.toUpperCase()}</Text>
      </View>
      {isPending && (
        <TouchableOpacity style={styles.actionButton} onPress={() => onDelete(spot.id)}>
          <Text style={styles.actionButtonText}>Eliminar publicación</Text>
        </TouchableOpacity>
      )}
      {isReserved && (
        <TouchableOpacity style={styles.actionButton} onPress={() => onCancel(spot.id)}>
          <Text style={styles.actionButtonText}>Anular reserva</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/*───────────────────────────── FORMULARIO OFERTA ─────────────────────────*/
const OfferForm = ({ onPublish }) => {
  const { colors } = useTheme();
  const [mode, setMode] = useState('now'); // 'now' | 'schedule'
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [useGPS, setUseGPS] = useState(true); // true → GPS | false → manual
  const [manualAddress, setManualAddress] = useState('');
  const [showIOS, setShowIOS] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  /*──────────── date‑time picker helpers ────────────*/
  const openPicker = () => {
    if (Platform.OS === 'android') {
      // Paso 1: fecha
      DateTimePickerAndroid.open({
        value: date,
        mode: 'date',
        is24Hour: true,
        onChange: (_e, selDate) => {
          if (selDate) {
            const d = new Date(date);
            d.setFullYear(selDate.getFullYear(), selDate.getMonth(), selDate.getDate());
            // Paso 2: hora
            DateTimePickerAndroid.open({
              value: d,
              mode: 'time',
              is24Hour: true,
              onChange: (_e2, selTime) => {
                if (selTime) {
                  d.setHours(selTime.getHours(), selTime.getMinutes(), 0, 0);
                  setDate(d);
                }
              },
            });
          }
        },
      });
    } else {
      setShowIOS(true);
    }
  };
  const onIOSChange = (_e, sel) => sel && setDate(sel);

  /*──────────── publicar ────────────*/
  const handlePublish = async () => {
    if (!description.trim()) return Toast.show({ type: 'error', text1: 'Añade una descripción' });
    if (!useGPS && !manualAddress.trim()) return Toast.show({ type: 'error', text1: 'Ingresa la dirección manual' });

    setIsPublishing(true);
    await onPublish({
      description,
      scheduledAt: mode === 'schedule' ? date.toISOString() : null,
      locationMode: useGPS ? 'gps' : 'manual',
      address: manualAddress.trim(),
    });
    setIsPublishing(false);
  };

  /*──────────── UI ────────────*/
  return (
    <>
      <View style={styles.header}>
        <Ionicons name="car-sport-outline" size={30} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Ofrecer Plaza</Text>
      </View>

      {/* NOW / SCHEDULE */}
      <View style={styles.row}>
        {['now', 'schedule'].map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.modeBtn, mode === m && { backgroundColor: colors.primary }]}
            onPress={() => setMode(m)}
          >
            <Text style={[styles.modeTxt, mode === m && { color: 'white' }]}>{m === 'now' ? 'Ahora' : 'Programar'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* descripción */}
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
        placeholder="Descripción (ej: coche gris, al lado de un árbol)"
        placeholderTextColor={colors.inactive}
        value={description}
        onChangeText={setDescription}
      />

      {/* GPS / Manual */}
      <View style={styles.row}>
        {[{ key: true, label: 'GPS', icon: 'locate' }, { key: false, label: 'Manual', icon: 'create' }].map(({ key, label, icon }) => (
          <TouchableOpacity
            key={label}
            style={[styles.modeBtnSmall, useGPS === key && { backgroundColor: colors.secondary }]}
            onPress={() => setUseGPS(key)}
          >
            <Ionicons name={icon} size={18} color={useGPS === key ? 'white' : colors.text} />
            <Text style={[styles.modeTxt, useGPS === key && { color: 'white' }]}> {label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!useGPS && (
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="Calle y número"
          placeholderTextColor={colors.inactive}
          value={manualAddress}
          onChangeText={setManualAddress}
        />
      )}

      {/* fecha / hora */}
      {mode === 'schedule' && (
        <TouchableOpacity style={[styles.dateButton, { borderColor: colors.primary }]} onPress={openPicker}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <Text style={[styles.modeTxt, { marginLeft: 6 }]}>
            {date.toLocaleDateString()} – {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>
      )}
      {showIOS && Platform.OS === 'ios' && (
        <DateTimePicker value={date} mode="datetime" display="spinner" is24Hour onChange={onIOSChange} />
      )}

      {/* botón publicar */}
      <TouchableOpacity
        style={[styles.mainButton, { backgroundColor: mode === 'now' ? colors.secondary : colors.primary }]}
        onPress={handlePublish}
        disabled={isPublishing}
      >
        {isPublishing ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.mainButtonTxt}>{mode === 'now' ? 'Publicar AHORA' : 'Programar Plaza'}</Text>
        )}
      </TouchableOpacity>
    </>
  );
};

/*────────────────────────── PANTALLA PRINCIPAL ─────────────────────────*/
const OfferParkingScreen = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [activeSpot, setActiveSpot] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  /* Escucha en tiempo real la plaza del usuario */
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'parkingSpaces'),
      where('providerId', '==', user.uid),
      where('status', 'in', ['pendiente', 'reservada'])
    );
    const unsub = onSnapshot(q, (snap) => {
      setActiveSpot(!snap.empty ? { id: snap.docs[0].id, ...snap.docs[0].data() } : null);
      setIsLoading(false);
    });
    return unsub;
  }, [user]);

  /* publicar plaza */
  const handlePublish = async (data) => {
    try {
      let payload = {
        description: data.description,
        scheduledAt: data.scheduledAt,
        providerId: user.uid,
        status: 'pendiente',
      };

      if (data.locationMode === 'gps') {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== 'granted') {
          Toast.show({ type: 'error', text1: 'Permiso Denegado', text2: 'Activa el GPS' });
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        payload = { ...payload, latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      } else {
        const geo = await Location.geocodeAsync(data.address);
        if (!geo.length) {
          Toast.show({ type: 'error', text1: 'Dirección no encontrada' });
          return;
        }
        payload = { ...payload, latitude: geo[0].latitude, longitude: geo[0].longitude, address: data.address };
      }

      await api.publishParkingSpace(payload);
      Toast.show({ type: 'success', text1: '¡Publicado!' });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error al publicar', text2: e.message });
    }
  };

  const handleDelete = async (id) => {
    await api.deleteParkingSpace({ spaceId: id });
    Toast.show({ type: 'success', text1: 'Publicación eliminada' });
  };
  const handleCancel = async (id) => {
    await api.cancelReservation({ spaceId: id });
    Toast.show({ type: 'success', text1: 'Reserva anulada' });
  };

  if (isLoading) {
    return <ActivityIndicator style={{ flex: 1, backgroundColor: colors.background }} size="large" color={colors.primary} />;
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {activeSpot ? (
        <ActiveSpotStatus spot={activeSpot} onDelete={handleDelete} onCancel={handleCancel} />
      ) : (
        <OfferForm onPublish={handlePublish} />
      )}
    </KeyboardAvoidingView>
  );
};

/*────────── estilos ─────────*/
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 30, marginTop: 40 },
  title: { fontSize: 26, fontWeight: 'bold', marginLeft: 8 },
  row: { flexDirection: 'row', marginBottom: 16 },
  modeBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: '#e0e0e0', marginHorizontal: 4 },
  modeBtnSmall: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: '#e0e0e0', marginHorizontal: 4 },
  modeTxt: { fontSize: 15, fontWeight: 'bold' },
  input: { width: '100%', height: 50, borderRadius: 12, paddingHorizontal: 15, marginBottom: 15, borderWidth: 1, fontSize: 15 },
  dateButton: { width: '100%', height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, marginBottom: 18, borderWidth: 1 },
  mainButton: { width: '100%', paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
  mainButtonTxt: { color: 'white', fontSize: 17, fontWeight: 'bold' },
  /* Active status */
  statusContainer: { padding: 26, borderRadius: 18, borderWidth: 1, alignItems: 'center', marginHorizontal: 6 },
  statusTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  statusInfo: { fontSize: 15, marginBottom: 16, fontStyle: 'italic', textAlign: 'center' },
  statusBadge: { backgroundColor: '#FFA500', paddingVertical: 4, paddingHorizontal: 14, borderRadius: 18, marginBottom: 10 },
  statusBadgeText: { color: 'white', fontWeight: 'bold' },
  actionButton: { backgroundColor: '#FF3B30', paddingVertical: 10, paddingHorizontal: 28, borderRadius: 12, marginTop: 12 },
  actionButtonText: { color: 'white', fontWeight: 'bold' },
});

export default OfferParkingScreen;
