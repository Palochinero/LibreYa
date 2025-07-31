// MapScreen.jsx - Versión Final y Corregida

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Text } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'; // Usamos los mapas de Google para mejor rendimiento
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { db } from '../api/firebase';

const MapScreen = ({ navigation }) => {
  // --- ESTADOS ---
  const [location, setLocation] = useState(null);
  const [parkingSpaces, setParkingSpaces] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);
  const { user } = useAuth(); // Obtenemos el usuario de nuestro contexto global

  // --- EFECTOS ---
  // Este efecto se ejecuta cuando el estado del 'user' cambia.
  useEffect(() => {
    let unsubscribeFromFirestore;

    // Solo intentamos obtener la ubicación y las plazas SI HAY un usuario con sesión iniciada.
    if (user) {
      const startWatching = async () => {
        // 1. Pedir permisos de ubicación.
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('El permiso para acceder a la ubicación fue denegado.');
          Alert.alert('Permiso Denegado', 'Para usar el mapa, habilita los permisos de ubicación en los ajustes.');
          return;
        }

        // 2. Obtener la ubicación inicial.
        try {
          let currentLocation = await Location.getCurrentPositionAsync({});
          setLocation(currentLocation.coords);
        } catch (error) {
          setErrorMsg('No se pudo obtener la ubicación.');
          Alert.alert('Error de Ubicación', 'No pudimos obtener tu ubicación. Asegúrate de tener el GPS activado.');
        }

        // 3. Empezar a escuchar las plazas 'pendientes' en Firestore.
        const q = query(collection(db, "parkingSpaces"), where("status", "==", "pendiente"));
        unsubscribeFromFirestore = onSnapshot(q, (querySnapshot) => {
          const spaces = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Nos aseguramos de que la plaza tenga coordenadas antes de añadirla
            if (data.location && data.location.latitude && data.location.longitude) {
              spaces.push({ id: doc.id, ...data });
            }
          });
          setParkingSpaces(spaces);
        });
      };

      startWatching();
    } else {
      // Si el usuario cierra sesión, limpiamos los datos.
      setLocation(null);
      setParkingSpaces([]);
      setErrorMsg(null);
    }

    // Devolvemos la función de limpieza: se ejecutará cuando el usuario cierre sesión.
    return () => {
      if (unsubscribeFromFirestore) {
        unsubscribeFromFirestore();
      }
    };
  }, [user]); // Se ejecuta cada vez que 'user' cambia (login/logout).

  
  // --- RENDERIZADO ---
  
  // Si no hay usuario, esta pantalla no debería mostrar nada,
  // ya que el AppNavigator nos tendría que haber llevado al Login.
  // Pero por seguridad, lo contemplamos.
  if (!user) {
    return (
        <View style={styles.loader}>
            <Text>Inicia sesión para ver el mapa.</Text>
        </View>
    );
  }

  // Si hubo un error con los permisos.
  if (errorMsg) {
    return (
        <View style={styles.loader}>
            <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
    );
  }
  
  // Mientras esperamos la primera ubicación del GPS.
  if (!location) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Obteniendo tu ubicación...</Text>
      </View>
    );
  }

  // ¡Todo correcto! Mostramos el mapa.
  return (
    <MapView
      provider={PROVIDER_GOOGLE} // ¡IMPORTANTE! Mejora el rendimiento y la calidad de los mapas
      style={styles.map}
      initialRegion={{
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      }}
      showsUserLocation={true}
      showsPointsOfInterest={false} // Quitamos puntos de interés de Google para un mapa más limpio
    >
      {parkingSpaces.map(space => (
        <Marker
          key={space.id}
          coordinate={{
            latitude: space.location.latitude,
            longitude: space.location.longitude,
          }}
          title="¡Plaza Libre!"
          description={space.description || 'Toca para ver detalles y reservar'}
          pinColor="green"
          onPress={() => navigation.navigate('ReservationDetail', { parkingSpaceId: space.id })}
        />
      ))}
    </MapView>
  );
};


// --- ESTILOS ---
const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    padding: 20,
  }
});

export default MapScreen;