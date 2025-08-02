// functions/src/cancelParkingSpace.ts – versión corregida y lista para desplegar

import * as functions from 'firebase-functions';
import { admin, db } from './utils/firebaseAdmin';      // instancia única
import { Expo } from 'expo-server-sdk';

const fn   = functions.region('us-central1');           // misma región que el resto
const expo = new Expo();

interface Payload { spaceId: string }

/**
 * El proveedor anula una reserva ya aceptada.
 * 1. Verifica auth y que el proveedor sea el dueño.
 * 2. Cambia status -> "cancelada" y elimina takerId.
 * 3. Resta 1 PARKCOIN al proveedor y suma contador de cancelaciones.
 * 4. Envía push al buscador y al proveedor.
 */
export const cancelParkingSpace = fn.https.onCall(async (data: Payload, context) => {
  /* ───── 1) Autenticación ───── */
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión');
  const { spaceId } = data;
  if (!spaceId) throw new functions.https.HttpsError('invalid-argument', 'Falta "spaceId"');

  /* ───── 2) Transacción ───── */
  await db.runTransaction(async (tx) => {
    const ref  = db.doc(`parkingSpaces/${spaceId}`);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new functions.https.HttpsError('not-found', 'La plaza no existe');

    const space = snap.data() as any;
    if (space.providerId !== uid) {
      throw new functions.https.HttpsError('permission-denied', 'No eres el propietario');
    }
    if (space.status !== 'reservada') {
      throw new functions.https.HttpsError('failed-precondition', 'Solo puedes anular reservas activas');
    }

    /* 2a. Actualiza la plaza */
    tx.update(ref, {
      status: 'cancelada',
      takerId: admin.firestore.FieldValue.delete(),
    });

    /* 2b. Ajusta PARKCOINS y contador */
    const userRef = db.doc(`users/${uid}`);
    tx.update(userRef, {
      parkcoins: admin.firestore.FieldValue.increment(-1),
      cancellations: admin.firestore.FieldValue.increment(1),
    });
  });

  /* ───── 3) Notificaciones push (fuera de la tx) ───── */
  try {
    const spaceSnap = await db.doc(`parkingSpaces/${spaceId}`).get();
    const space = spaceSnap.data() as any;
    const messages: Expo.PushMessage[] = [];

    if (space.takerPushToken && Expo.isExpoPushToken(space.takerPushToken)) {
      messages.push({
        to: space.takerPushToken,
        title: 'Reserva cancelada',
        body: 'El conductor anuló la plaza que ibas a ocupar.',
      });
    }
    if (space.providerPushToken && Expo.isExpoPushToken(space.providerPushToken)) {
      messages.push({
        to: space.providerPushToken,
        title: 'Has perdido 1 PARKCOIN',
        body: 'Si sigues cancelando, podrías ser penalizado.',
      });
    }
    for (const chunk of expo.chunkPushNotifications(messages)) {
      await expo.sendPushNotificationsAsync(chunk);
    }
  } catch (_) {/* ignoramos errores de push */}

  return { ok: true };
});
