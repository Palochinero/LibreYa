// functions/src/completeParkingSpace.ts – Función para completar reserva de plaza

import * as functions from 'firebase-functions';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { admin, db } from './utils/firebaseAdmin';
import { addPointsToUser } from './utils/userUtils';

const fn = functions.region('us-central1');
const expo = new Expo();

interface Payload {
  spaceId: string;
}

/**
 * El conductor marca que ya ocupó la plaza.
 * 1. Verifica auth y que el conductor sea el taker.
 * 2. Cambia status -> "completada".
 * 3. Suma 1 PARKCOIN al proveedor.
 * 4. Envía push al proveedor y al conductor.
 */
export const completeParkingSpace = fn.https.onCall(async (data: Payload, context) => {
  /* ───── 1) Autenticación ───── */
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión');
  
  const { spaceId } = data;
  if (!spaceId) throw new functions.https.HttpsError('invalid-argument', 'Falta "spaceId"');

  /* ───── 2) Transacción ───── */
  let spaceData: any;
  let providerId: string;
  
  await db.runTransaction(async (tx) => {
    const spaceRef = db.doc(`parkingSpaces/${spaceId}`);
    const spaceSnap = await tx.get(spaceRef);
    
    if (!spaceSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'La plaza no existe');
    }

    spaceData = spaceSnap.data();
    providerId = spaceData.providerId;

    if (spaceData.takerId !== uid) {
      throw new functions.https.HttpsError('permission-denied', 'No eres el conductor de esta reserva');
    }
    if (spaceData.status !== 'reservada') {
      throw new functions.https.HttpsError('failed-precondition', 'Solo puedes completar reservas activas');
    }

    /* 2a. Marcar como completada */
    tx.update(spaceRef, {
      status: 'completada',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    /* 2b. Dar PARKCOIN al proveedor */
    await addPointsToUser(providerId, 1, 'Plaza completada por conductor', tx);
  });

  /* ───── 3) Notificaciones push (fuera de la tx) ───── */
  try {
    const messages: ExpoPushMessage[] = [];

    // Push al proveedor
    if (spaceData.providerPushToken && Expo.isExpoPushToken(spaceData.providerPushToken)) {
      messages.push({
        to: spaceData.providerPushToken,
        title: '¡Plaza completada!',
        body: `Has ganado 1 PARKCOIN. El conductor completó el uso de tu plaza.`,
        data: { spaceId, type: 'completion' },
      });
    }

    // Push al conductor
    if (spaceData.takerPushToken && Expo.isExpoPushToken(spaceData.takerPushToken)) {
      messages.push({
        to: spaceData.takerPushToken,
        title: 'Reserva completada',
        body: 'Has marcado como completada tu reserva de plaza.',
        data: { spaceId, type: 'completion' },
      });
    }

    // Enviar notificaciones
    for (const chunk of expo.chunkPushNotifications(messages)) {
      await expo.sendPushNotificationsAsync(chunk);
    }
  } catch (error) {
    functions.logger.error('Error enviando notificaciones push:', error);
  }

  return { 
    success: true, 
    message: 'Plaza completada correctamente',
    parkcoinsEarned: 1
  };
}); 