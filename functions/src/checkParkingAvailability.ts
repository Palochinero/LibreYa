import * as functions from 'firebase-functions';
import { admin, db } from './utils/firebaseAdmin';

const fn = functions.region('us-central1');

interface CheckAvailabilityPayload {
  latitude: number;
  longitude: number;
  radius?: number; // Radio en metros, por defecto 1000m
}

export const checkParkingAvailability = fn.https.onCall(async (data: CheckAvailabilityPayload, context) => {
  // Verificar autenticación
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  const { latitude, longitude, radius = 1000 } = data;

  // Validar coordenadas
  if (!latitude || !longitude) {
    throw new functions.https.HttpsError('invalid-argument', 'Latitud y longitud son requeridas');
  }

  try {
    // Buscar plazas disponibles en el radio especificado
    const parkingSpacesRef = db.collection('parkingSpaces');
    const query = parkingSpacesRef
      .where('status', '==', 'pendiente')
      .where('isScheduled', '==', false); // Solo plazas instantáneas

    const snapshot = await query.get();
    
    let availableSpaces = 0;
    const spacesInRange: any[] = [];

    // Calcular distancia para cada plaza encontrada
    snapshot.forEach((doc) => {
      const spaceData = doc.data();
      if (spaceData.latitude && spaceData.longitude) {
        const distance = calculateDistance(
          latitude,
          longitude,
          spaceData.latitude,
          spaceData.longitude
        );

        // Si está dentro del radio especificado
        if (distance <= radius) {
          availableSpaces++;
          spacesInRange.push({
            id: doc.id,
            distance: Math.round(distance),
            ...spaceData
          });
        }
      }
    });

    // Ordenar por distancia
    spacesInRange.sort((a, b) => a.distance - b.distance);

    return {
      success: true,
      availableSpaces,
      spacesInRange: spacesInRange.slice(0, 5), // Solo las 5 más cercanas
      radius,
      userLocation: { latitude, longitude }
    };

  } catch (error) {
    console.error('Error checking parking availability:', error);
    throw new functions.https.HttpsError('internal', 'Error al verificar disponibilidad');
  }
});

// Función auxiliar para calcular distancia entre dos puntos (fórmula de Haversine)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distancia en metros
} 