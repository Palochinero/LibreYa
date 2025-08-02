// functions/src/cancelWithPenalty.ts – Función para cancelar con penalización

import * as functions from 'firebase-functions';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { admin, db } from './utils/firebaseAdmin';

const fn = functions.region('us-central1');
const expo = new Expo();

interface CancelWithPenaltyPayload {
  spaceId: string;
  reason: 'found_better_plaza' | 'emergency' | 'other';
  details?: string;
}

/**
 * Permite al conductor cancelar una plaza con penalización.
 * 1. Verifica que el conductor sea el taker.
 * 2. Resta 1 PARKCOIN al conductor.
 * 3. Notifica al proveedor para que pueda reportar si es necesario.
 * 4. Actualiza el estado de la plaza.
 */
export const cancelWithPenalty = fn.https.onCall(async (data: CancelWithPenaltyPayload, context) => {
  /* ───── 1) Autenticación ───── */
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión');
  
  const { spaceId, reason, details } = data;
  if (!spaceId || !reason) {
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
      throw new functions.https.HttpsError('failed-precondition', 'Solo puedes cancelar reservas activas');
    }

    /* ───── 3) Transacción para cancelar con penalización ───── */
    await db.runTransaction(async (tx) => {
      // Actualizar la plaza
      tx.update(spaceRef, {
        status: 'cancelada_penalizacion',
        takerId: admin.firestore.FieldValue.delete(),
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        cancellationReason: reason,
        cancellationDetails: details || '',
        cancelledBy: uid,
      });

      // Restar 1 PARKCOIN al conductor
      const userRef = db.doc(`users/${uid}`);
      tx.update(userRef, {
        parkcoins: admin.firestore.FieldValue.increment(-1),
        cancellations: admin.firestore.FieldValue.increment(1),
        lastCancellationAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    /* ───── 4) Notificar al proveedor ───── */
    try {
      const messages: ExpoPushMessage[] = [];
      
      if (spaceData.providerPushToken && Expo.isExpoPushToken(spaceData.providerPushToken)) {
        let message = '';
        if (reason === 'found_better_plaza') {
          message = 'El conductor canceló porque encontró otra plaza. Puedes reportarlo si no es justificado.';
        } else {
          message = 'El conductor canceló la reserva. Puedes reportarlo si consideras que no es justificado.';
        }
        
        messages.push({
          to: spaceData.providerPushToken,
          title: 'Reserva cancelada con penalización',
          body: message,
          data: { 
            spaceId, 
            type: 'cancellation_penalty',
            reason,
            canReport: true
          },
        });
      }

      // Enviar notificaciones
      for (const chunk of expo.chunkPushNotifications(messages)) {
        await expo.sendPushNotificationsAsync(chunk);
      }
    } catch (error) {
      functions.logger.error('Error enviando notificaciones de cancelación:', error);
    }

    return {
      success: true,
      message: 'Plaza cancelada con penalización. Has perdido 1 PARKCOIN.',
      parkcoinsLost: 1,
      canBeReported: true
    };

  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    functions.logger.error('Error cancelando plaza con penalización:', error);
    throw new functions.https.HttpsError('internal', 'Error interno del servidor');
  }
}); 