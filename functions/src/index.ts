// functions/src/index.ts  ✅ limpio

import * as functions from 'firebase-functions';
import * as geohash   from 'ngeohash';         // ← IMPORT CORRECTO
import { admin, db }  from './utils/firebaseAdmin';  // ← usa la instancia única

const region = functions.region('us-central1'); // misma región que en el front

/* ─────────── utilidades ─────────── */
const toRad = (deg: number) => (deg * Math.PI) / 180;
const haversine = (Lat1: number, Lon1: number, Lat2: number, Lon2: number) => {
  const R = 6371;   // km
  const dLat = toRad(Lat2 - Lat1);
  const dLon = toRad(Lon2 - Lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(Lat1)) * Math.cos(toRad(Lat2)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const iso = (d: Date | string) => new Date(d).toISOString().slice(0, 19);

/* ─────────── FUNCTIONS EXPORTABLES ─────────── */

// Publicar una nueva plaza de estacionamiento
export const publishParkingSpace = region.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión');

  const { address, latitude, longitude, price, startTime, endTime, description, isScheduled = false } = data;
  
  if (!address || !latitude || !longitude || !price || !startTime) {
    throw new functions.https.HttpsError('invalid-argument', 'Faltan datos requeridos');
  }

  try {
    /* ───── 1) Verificar límites de publicación ───── */
    const userRef = db.doc(`users/${uid}`);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Usuario no encontrado');
    }

    const userData = userSnap.data();
    const userPlan = userData.plan || 'free';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Contar publicaciones de hoy
    const todayPublicationsQuery = await db.collection('parkingSpaces')
      .where('providerId', '==', uid)
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(today))
      .get();

    const todayPublications = todayPublicationsQuery.size;
    
    // Verificar límites según el plan
    let canPublish = false;
    let dailyLimit = 1;

    switch (userPlan) {
      case 'free':
        dailyLimit = 1;
        canPublish = todayPublications < dailyLimit;
        break;
        
      case 'premium':
        canPublish = true; // Sin límites
        break;
        
      case 'ad_supported':
        const adsWatched = userData.adsWatchedToday || 0;
        dailyLimit = 1 + (adsWatched * 2);
        canPublish = todayPublications < dailyLimit;
        break;
        
      default:
        dailyLimit = 1;
        canPublish = todayPublications < dailyLimit;
    }

    if (!canPublish) {
      throw new functions.https.HttpsError('resource-exhausted', 
        `Has alcanzado el límite diario de ${dailyLimit} publicación(es). ` +
        (userPlan === 'free' ? 'Actualiza a Premium por €5/mes para publicar sin límites.' : 
         'Ve más anuncios o actualiza a Premium para publicar más.')
      );
    }

    /* ───── 2) Crear la plaza ───── */
    const parkingSpaceData = {
      providerId: uid,
      address,
      latitude,
      longitude,
      price: parseFloat(price),
      startTime: admin.firestore.Timestamp.fromDate(new Date(startTime)),
      endTime: endTime ? admin.firestore.Timestamp.fromDate(new Date(endTime)) : null,
      description: description || '',
      status: 'pendiente',
      isScheduled: Boolean(isScheduled), // Campo para distinguir plazas instantáneas vs programadas
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      geohash: geohash.encode(latitude, longitude, 9),
    };

    const docRef = await db.collection('parkingSpaces').add(parkingSpaceData);
    
    return { 
      success: true, 
      spaceId: docRef.id,
      message: 'Plaza publicada correctamente',
      isScheduled: Boolean(isScheduled),
      todayPublications: todayPublications + 1,
      dailyLimit
    };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Error al publicar la plaza');
  }
});

// Buscar y asignar una plaza de estacionamiento
export const findAndAssignParkingSpace = region.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión');

  const { latitude, longitude, maxDistance = 5 } = data; // maxDistance en km
  
  if (!latitude || !longitude) {
    throw new functions.https.HttpsError('invalid-argument', 'Se requieren coordenadas');
  }

  try {
    // Buscar plazas disponibles cerca de la ubicación
    const geohashPrefix = geohash.encode(latitude, longitude, 6);
    const parkingSpacesRef = db.collection('parkingSpaces');
    
    const query = parkingSpacesRef
      .where('status', '==', 'pendiente')
      .where('geohash', '>=', geohashPrefix)
      .where('geohash', '<=', geohashPrefix + '\uf8ff')
      .limit(10);

    const snapshot = await query.get();
    const availableSpaces: any[] = [];

    snapshot.forEach(doc => {
      const space = doc.data();
      const distance = haversine(latitude, longitude, space.latitude, space.longitude);
      
      if (distance <= maxDistance) {
        availableSpaces.push({
          id: doc.id,
          ...space,
          distance
        });
      }
    });

    // Ordenar por distancia
    availableSpaces.sort((a, b) => a.distance - b.distance);

    if (availableSpaces.length === 0) {
      return { 
        success: false, 
        message: 'No se encontraron plazas disponibles en tu área' 
      };
    }

    // Intentar reservar la plaza más cercana
    const bestSpace = availableSpaces[0];
    const spaceRef = db.doc(`parkingSpaces/${bestSpace.id}`);

    const result = await db.runTransaction(async (tx) => {
      const spaceDoc = await tx.get(spaceRef);
      
      if (!spaceDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'La plaza ya no está disponible');
      }

      const spaceData = spaceDoc.data();
      if (!spaceData || spaceData.status !== 'pendiente') {
        throw new functions.https.HttpsError('failed-precondition', 'La plaza ya fue reservada');
      }

      // Reservar la plaza
      tx.update(spaceRef, {
        status: 'reservada',
        takerId: uid,
        reservedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        spaceId: bestSpace.id,
        space: {
          ...bestSpace,
          status: 'reservada',
          takerId: uid
        },
        message: 'Plaza reservada correctamente'
      };
    });

    return result;
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Error al buscar plazas');
  }
});

// Nueva: cancelParkingSpace  (importada desde su módulo)
export { cancelParkingSpace } from './cancelParkingSpace';

// Nueva: deleteParkingSpace  (importada desde su módulo)
export { deleteParkingSpace } from './deleteParkingSpace';

// Completar una reserva de plaza
export const completeParkingSpace = region.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión');

  const { spaceId } = data;
  if (!spaceId) throw new functions.https.HttpsError('invalid-argument', 'Falta "spaceId"');

  try {
    await db.runTransaction(async (tx) => {
      const spaceRef = db.doc(`parkingSpaces/${spaceId}`);
      const spaceSnap = await tx.get(spaceRef);
      
      if (!spaceSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'La plaza no existe');
      }

      const space = spaceSnap.data();
      if (!space || space.takerId !== uid) {
        throw new functions.https.HttpsError('permission-denied', 'No eres el conductor de esta reserva');
      }
      if (!space || space.status !== 'reservada') {
        throw new functions.https.HttpsError('failed-precondition', 'Solo puedes completar reservas activas');
      }

      // Marcar como completada
      tx.update(spaceRef, {
        status: 'completada',
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Dar PARKCOINS al proveedor
      const providerRef = db.doc(`users/${space.providerId}`);
      tx.update(providerRef, {
        parkcoins: admin.firestore.FieldValue.increment(1),
      });
    });

    return { success: true, message: 'Reserva completada correctamente' };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Error al completar la reserva');
  }
});

// ─────────── NUEVAS FUNCIONES AGREGADAS ───────────

// Auto-expirar plazas programadas (tarea programada)
export { autoExpireParkingSpace } from './autoExpireParkingSpace';

// Penalizar usuarios abusivos (tarea programada diaria)
export { penalizeAbusers } from './penalizeAbusers';

// Reportar usuarios problemáticos
export { reportUser } from './reportUser';

// Generar índices geográficos automáticamente (trigger)
export { geoIndexParkingSpace } from './geoIndexParkingSpace';

// ─────────── FUNCIONES DE SEGUIMIENTO EN TIEMPO REAL ───────────

// Actualizar ubicación del conductor en tiempo real
export { trackParkingSpace } from './trackParkingSpace';

// Obtener información de seguimiento
export { getTrackingInfo } from './getTrackingInfo';

// ─────────── FUNCIONES DE REPORTES Y LÍMITES ───────────

// Cancelar plaza con penalización
export { cancelWithPenalty } from './cancelWithPenalty';

// Verificar límites de publicación
export { checkPublishLimits } from './checkPublishLimits';
