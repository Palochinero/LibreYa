import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/firebase';
import * as Location from 'expo-location';

const AnonymousReportScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [selectedReason, setSelectedReason] = useState('');

  const reportReasons = [
    {
      id: 'scammer',
      title: 'Gorrista/Scammer',
      description: 'Alguien que te muestra plazas para que las ocupes y luego te cobra',
      icon: 'person-remove'
    },
    {
      id: 'fake_plaza',
      title: 'Plaza Falsa',
      description: 'Plaza que no existe o está ocupada permanentemente',
      icon: 'close-circle'
    },
    {
      id: 'inappropriate',
      title: 'Comportamiento Inapropiado',
      description: 'Acoso, amenazas o comportamiento agresivo',
      icon: 'warning'
    },
    {
      id: 'other',
      title: 'Otro',
      description: 'Otro tipo de problema',
      icon: 'ellipsis-horizontal'
    }
  ];

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos', 'Se necesita permiso de ubicación para el reporte anónimo');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      setLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: address[0] ? 
          `${address[0].street}, ${address[0].city}` : 
          'Ubicación actual'
      });
    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
      Alert.alert('Error', 'No se pudo obtener tu ubicación');
    }
  };

  const handleSubmitReport = async () => {
    if (!selectedReason) {
      Alert.alert('Error', 'Selecciona un motivo para el reporte');
      return;
    }

    if (!location) {
      Alert.alert('Error', 'No se pudo obtener tu ubicación');
      return;
    }

    if (details.trim().length < 10) {
      Alert.alert('Error', 'Proporciona más detalles (mínimo 10 caracteres)');
      return;
    }

    setLoading(true);

    try {
      const result = await api.reportUser({
        reason: selectedReason,
        details: details.trim(),
        isAnonymous: true,
        location,
      });

      Alert.alert(
        'Reporte Enviado',
        'Gracias por ayudar a mantener la comunidad segura. Tu reporte anónimo ha sido enviado.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error enviando reporte:', error);
      Alert.alert('Error', 'No se pudo enviar el reporte. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const getReasonIcon = (reasonId) => {
    switch (reasonId) {
      case 'scammer': return 'person-remove';
      case 'fake_plaza': return 'close-circle';
      case 'inappropriate': return 'warning';
      case 'other': return 'ellipsis-horizontal';
      default: return 'help-circle';
    }
  };

  const getReasonColor = (reasonId) => {
    switch (reasonId) {
      case 'scammer': return '#ff5722';
      case 'fake_plaza': return '#f44336';
      case 'inappropriate': return '#ff9800';
      case 'other': return '#9e9e9e';
      default: return colors.primary;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Reporte Anónimo
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Información */}
        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.text }]}>
            Tu reporte será completamente anónimo. Ayúdanos a mantener la comunidad segura.
          </Text>
        </View>

        {/* Ubicación */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Ubicación del Problema
          </Text>
          {location ? (
            <View style={styles.locationInfo}>
              <Ionicons name="location" size={20} color={colors.primary} />
              <Text style={[styles.locationText, { color: colors.text }]}>
                {location.address}
              </Text>
            </View>
          ) : (
            <View style={styles.locationInfo}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.locationText, { color: colors.text }]}>
                Obteniendo ubicación...
              </Text>
            </View>
          )}
        </View>

        {/* Motivos */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            ¿Qué tipo de problema quieres reportar?
          </Text>
          
          {reportReasons.map((reason) => (
            <TouchableOpacity
              key={reason.id}
              style={[
                styles.reasonCard,
                { 
                  backgroundColor: selectedReason === reason.id ? colors.primary : colors.background,
                  borderColor: getReasonColor(reason.id)
                }
              ]}
              onPress={() => setSelectedReason(reason.id)}
            >
              <Ionicons 
                name={reason.icon} 
                size={24} 
                color={selectedReason === reason.id ? 'white' : getReasonColor(reason.id)} 
              />
              <View style={styles.reasonContent}>
                <Text style={[
                  styles.reasonTitle,
                  { color: selectedReason === reason.id ? 'white' : colors.text }
                ]}>
                  {reason.title}
                </Text>
                <Text style={[
                  styles.reasonDescription,
                  { color: selectedReason === reason.id ? 'rgba(255,255,255,0.8)' : colors.text }
                ]}>
                  {reason.description}
                </Text>
              </View>
              {selectedReason === reason.id && (
                <Ionicons name="checkmark-circle" size={24} color="white" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Detalles */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Proporciona más detalles
          </Text>
          <TextInput
            style={[
              styles.textInput,
              { 
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.border
              }
            ]}
            placeholder="Describe lo que pasó (mínimo 10 caracteres)..."
            placeholderTextColor={colors.text}
            value={details}
            onChangeText={setDetails}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Text style={[styles.charCount, { color: colors.text }]}>
            {details.length}/500 caracteres
          </Text>
        </View>

        {/* Botón de envío */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            { 
              backgroundColor: loading ? colors.border : colors.primary,
              opacity: loading ? 0.7 : 1
            }
          ]}
          onPress={handleSubmitReport}
          disabled={loading || !selectedReason || details.length < 10}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="send" size={20} color="white" />
          )}
          <Text style={styles.submitButtonText}>
            {loading ? 'Enviando...' : 'Enviar Reporte Anónimo'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  reasonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
  },
  reasonContent: {
    flex: 1,
    marginLeft: 12,
  },
  reasonTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  reasonDescription: {
    fontSize: 14,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default AnonymousReportScreen; 