// functions/src/getTrackingInfo.ts – Función para obtener información de seguimiento

import * as functions from 'firebase-functions';
import { admin, db } from './utils/firebaseAdmin';

const fn = functions.region('us-central1');

interface TrackingInfo {
  spaceId: string;
}

/**
 * Obtiene la información de seguimiento en tiempo real de una plaza.
 * Solo funciona para plazas instantáneas (no programadas).
 * Retorna ubicación del conductor, tiempo estimado y estado.
 */
export const getTrackingInfo = fn.https.onCall(async (data: TrackingInfo, context) => {
  /* ───── 1) Autenticación ───── */
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión');
  
  const { spaceId } = data;
  if (!spaceId) throw new functions.https.HttpsError('invalid-argument', 'Falta "spaceId"');

  try {
    /* ───── 2) Obtener información de la plaza ───── */
    const spaceRef = db.doc(`parkingSpaces/${spaceId}`);
    const spaceSnap = await spaceRef.get();
    
    if (!spaceSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'La plaza no existe');
    }

    const spaceData = spaceSnap.data();
    if (!spaceData) {
      throw new functions.https.HttpsError('not-found', 'Datos de plaza no encontrados');
    }
    
    // Verificar que el usuario sea el proveedor o el conductor
    if (spaceData.providerId !== uid && spaceData.takerId !== uid) {
      throw new functions.https.HttpsError('permission-denied', 'No tienes permisos para ver esta información');
    }
    
    // Verificar que la plaza esté reservada
    if (spaceData.status !== 'reservada') {
      throw new functions.https.HttpsError('failed-precondition', 'La plaza no está reservada');
    }
    
    // Verificar que sea plaza instantánea (no programada)
    if (spaceData.isScheduled) {
      throw new functions.https.HttpsError('failed-precondition', 'No hay seguimiento disponible para plazas programadas');
    }

    /* ───── 3) Preparar información de seguimiento ───── */
    const trackingInfo: any = {
      spaceId,
      isInstant: !spaceData.isScheduled,
      providerLocation: {
        latitude: spaceData.latitude,
        longitude: spaceData.longitude,
        address: spaceData.address
      }
    };

    // Si hay información del conductor, agregarla
    if (spaceData.takerLocation) {
      trackingInfo.takerLocation = {
        latitude: spaceData.takerLocation.latitude,
        longitude: spaceData.takerLocation.longitude,
        updatedAt: spaceData.takerLocation.updatedAt,
        status: spaceData.takerStatus || 'en_camino',
        distance: spaceData.distanceToDestination || 0,
        estimatedArrival: spaceData.estimatedArrival || null
      };
    }

    // Calcular tiempo restante si hay información
    if (spaceData.takerLocation && spaceData.estimatedArrival) {
      const now = new Date();
      const estimatedTime = new Date(spaceData.estimatedArrival);
      const timeRemaining = Math.max(0, Math.floor((estimatedTime.getTime() - now.getTime()) / (1000 * 60)));
      
      trackingInfo.timeRemaining = timeRemaining; // en minutos
      trackingInfo.isDelayed = timeRemaining > spaceData.estimatedArrival;
    }

    return {
      success: true,
      trackingInfo,
      message: 'Información de seguimiento obtenida'
    };

  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    functions.logger.error('Error obteniendo información de seguimiento:', error);
    throw new functions.https.HttpsError('internal', 'Error interno del servidor');
  }
}); 