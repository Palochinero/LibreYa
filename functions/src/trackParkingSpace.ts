// functions/src/trackParkingSpace.ts – Función para seguimiento en tiempo real

import * as functions from 'firebase-functions';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { admin, db } from './utils/firebaseAdmin';

const fn = functions.region('us-central1');
const expo = new Expo();

interface TrackPayload {
  spaceId: string;
  latitude: number;
  longitude: number;
  estimatedArrival?: number; // tiempo estimado en minutos
  status: 'en_camino' | 'cerca' | 'llegando' | 'llegado';
}

/**
 * El conductor actualiza su ubicación en tiempo real mientras va hacia la plaza.
 * Solo funciona para plazas instantáneas (no programadas).
 * 1. Verifica que la plaza sea instantánea y esté reservada.
 * 2. Actualiza la ubicación del conductor.
 * 3. Calcula tiempo estimado de llegada.
 * 4. Notifica al proveedor si es necesario.
 */
export const trackParkingSpace = fn.https.onCall(async (data: TrackPayload, context) => {
  /* ───── 1) Autenticación ───── */
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión');
  
  const { spaceId, latitude, longitude, estimatedArrival, status } = data;
  
  if (!spaceId || !latitude || !longitude || !status) {
    throw new functions.https.HttpsError('invalid-argument', 'Faltan datos requeridos');
  }

  try {
    /* ───── 2) Verificar plaza y permisos ───── */
    const spaceRef = db.doc(`parkingSpaces/${spaceId}`);
    const spaceSnap = await spaceRef.get();
    
    if (!spaceSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'La plaza no existe');
    }

    const spaceData = spaceSnap.data();
    if (!spaceData) {
      throw new functions.https.HttpsError('not-found', 'Datos de plaza no encontrados');
    }
    
    // Verificar que el usuario es el conductor
    if (spaceData.takerId !== uid) {
      throw new functions.https.HttpsError('permission-denied', 'No eres el conductor de esta reserva');
    }
    
    // Verificar que la plaza esté reservada
    if (spaceData.status !== 'reservada') {
      throw new functions.https.HttpsError('failed-precondition', 'La plaza no está reservada');
    }
    
    // Verificar que sea plaza instantánea (no programada)
    if (spaceData.isScheduled) {
      throw new functions.https.HttpsError('failed-precondition', 'No se puede hacer seguimiento en plazas programadas');
    }

    /* ───── 3) Actualizar ubicación del conductor ───── */
    const updateData: any = {
      takerLocation: {
        latitude,
        longitude,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      takerStatus: status
    };

    // Si hay tiempo estimado, agregarlo
    if (estimatedArrival) {
      updateData.estimatedArrival = estimatedArrival;
    }

    // Calcular distancia al destino
    const distance = calculateDistance(
      latitude, 
      longitude, 
      spaceData.latitude, 
      spaceData.longitude
    );
    
    updateData.distanceToDestination = distance;

    await spaceRef.update(updateData);

    /* ───── 4) Notificar al proveedor si es necesario ───── */
    if (status === 'cerca' || status === 'llegando') {
      try {
        const messages: ExpoPushMessage[] = [];
        
        if (spaceData.providerPushToken && Expo.isExpoPushToken(spaceData.providerPushToken)) {
          let message = '';
          if (status === 'cerca') {
            message = `El conductor está cerca de tu plaza (${distance.toFixed(1)}km)`;
          } else if (status === 'llegando') {
            message = '¡El conductor está llegando a tu plaza!';
          }
          
          messages.push({
            to: spaceData.providerPushToken,
            title: 'Conductor en camino',
            body: message,
            data: { 
              spaceId, 
              type: 'tracking',
              status,
              distance: distance.toFixed(1)
            },
          });
        }

        // Enviar notificaciones
        for (const chunk of expo.chunkPushNotifications(messages)) {
          await expo.sendPushNotificationsAsync(chunk);
        }
      } catch (error) {
        functions.logger.error('Error enviando notificaciones de seguimiento:', error);
      }
    }

    return {
      success: true,
      distance: distance.toFixed(1),
      status,
      message: 'Ubicación actualizada correctamente'
    };

  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    functions.logger.error('Error actualizando ubicación:', error);
    throw new functions.https.HttpsError('internal', 'Error interno del servidor');
  }
});

/**
 * Función auxiliar para calcular distancia entre dos puntos
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
} 