// functions/src/reportUser.ts – Función para reportar usuarios

import * as functions from 'firebase-functions';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { admin, db } from './utils/firebaseAdmin';

const fn = functions.region('us-central1');
const expo = new Expo();

interface ReportPayload {
  reportedUserId?: string; // Opcional para reportes anónimos
  reason: 'no_show' | 'fake_plaza' | 'scammer' | 'inappropriate' | 'other';
  details: string;
  spaceId?: string; // Opcional para reportes relacionados con plazas
  isAnonymous?: boolean; // Para reportes anónimos
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

/**
 * Permite a los usuarios reportar a otros usuarios por diferentes motivos.
 * 1. Reportes normales: entre usuarios conocidos
 * 2. Reportes anónimos: para reportar gorristas/scammers
 * 3. Sistema de recompensas: 2 PARKCOINS por reporte válido
 * 4. Alertas automáticas: cuando hay 10 reportes en una zona
 */
export const reportUser = fn.https.onCall(async (data: ReportPayload, context) => {
  /* ───── 1) Autenticación ───── */
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión');
  
  const { reportedUserId, reason, details, spaceId, isAnonymous = false, location } = data;
  
  if (!reason || !details) {
    throw new functions.https.HttpsError('invalid-argument', 'Faltan datos requeridos');
  }

  // Para reportes normales, se requiere reportedUserId
  if (!isAnonymous && !reportedUserId) {
    throw new functions.https.HttpsError('invalid-argument', 'Falta "reportedUserId" para reportes normales');
  }

  // Para reportes anónimos, se requiere ubicación
  if (isAnonymous && !location) {
    throw new functions.https.HttpsError('invalid-argument', 'Falta ubicación para reportes anónimos');
  }

  try {
    /* ───── 2) Verificar límites de reportes ───── */
    const userRef = db.doc(`users/${uid}`);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Usuario no encontrado');
    }

    const userData = userSnap.data();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Verificar límite de reportes diarios (máximo 3 por día)
    const todayReports = userData.dailyReports || 0;
    if (todayReports >= 3) {
      throw new functions.https.HttpsError('resource-exhausted', 'Has alcanzado el límite de reportes diarios');
    }

    /* ───── 3) Crear el reporte ───── */
    const reportData: any = {
      reporterId: uid,
      reason,
      details,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isAnonymous,
      status: 'pending', // pending, reviewed, resolved, dismissed
    };

    if (reportedUserId) {
      reportData.reportedUserId = reportedUserId;
    }

    if (spaceId) {
      reportData.spaceId = spaceId;
    }

    if (location) {
      reportData.location = location;
      // Generar geohash para búsquedas por zona
      const geohash = require('ngeohash');
      reportData.geoHash = geohash.encode(location.latitude, location.longitude, 6);
    }

    const reportRef = await db.collection('reports').add(reportData);

    /* ───── 4) Actualizar contadores del usuario ───── */
    await userRef.update({
      dailyReports: admin.firestore.FieldValue.increment(1),
      totalReports: admin.firestore.FieldValue.increment(1),
    });

    /* ───── 5) Si es reporte normal, actualizar contador del reportado ───── */
    if (reportedUserId && !isAnonymous) {
      const reportedUserRef = db.doc(`users/${reportedUserId}`);
      await reportedUserRef.update({
        reportCount: admin.firestore.FieldValue.increment(1),
      });
    }

    /* ───── 6) Verificar si hay suficientes reportes en la zona (para anónimos) ───── */
    if (isAnonymous && location) {
      const geohash = require('ngeohash');
      const zoneHash = geohash.encode(location.latitude, location.longitude, 6);
      
      const zoneReportsQuery = await db.collection('reports')
        .where('geoHash', '==', zoneHash)
        .where('isAnonymous', '==', true)
        .where('reason', 'in', ['scammer', 'fake_plaza'])
        .get();

      if (zoneReportsQuery.size >= 10) {
        // Enviar alerta al administrador
        await sendAdminAlert({
          type: 'zone_scammer_alert',
          location,
          reportCount: zoneReportsQuery.size,
          zoneHash,
        });
      }
    }

    /* ───── 7) Recompensa por reporte válido ───── */
    if (!isAnonymous && reason === 'no_show') {
      // Dar 2 PARKCOINS al reporter por reporte de no-show
      await addPointsToUser(uid, 2, 'Reporte de no-show válido', null);
    }

    return {
      success: true,
      reportId: reportRef.id,
      message: isAnonymous ? 
        'Reporte anónimo enviado. Gracias por ayudar a mantener la comunidad segura.' :
        'Reporte enviado correctamente. Será revisado por nuestro equipo.',
      parkcoinsEarned: (!isAnonymous && reason === 'no_show') ? 2 : 0
    };

  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    functions.logger.error('Error creando reporte:', error);
    throw new functions.https.HttpsError('internal', 'Error interno del servidor');
  }
});

/**
 * Función auxiliar para enviar alertas al administrador
 */
async function sendAdminAlert(alertData: any) {
  try {
    // Crear documento de alerta
    await db.collection('adminAlerts').add({
      ...alertData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'new',
    });

    // Aquí se podría enviar notificación push al admin
    // Por ahora solo se guarda en la base de datos
    functions.logger.info('Alerta de administrador creada:', alertData);
  } catch (error) {
    functions.logger.error('Error enviando alerta al admin:', error);
  }
}

/**
 * Función auxiliar para agregar puntos a un usuario
 */
async function addPointsToUser(userId: string, points: number, reason: string, transaction: any) {
  const userRef = db.doc(`users/${userId}`);
  
  if (transaction) {
    transaction.update(userRef, {
      parkcoins: admin.firestore.FieldValue.increment(points),
      lastPointsUpdate: admin.firestore.FieldValue.serverTimestamp(),
    });
  } else {
    await userRef.update({
      parkcoins: admin.firestore.FieldValue.increment(points),
      lastPointsUpdate: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
} 