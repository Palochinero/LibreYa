// functions/src/deleteParkingSpace.ts – versión corregida

import * as functions from 'firebase-functions';
import { admin, db } from './utils/firebaseAdmin'; // instancia única

// Reutilizamos la misma región que en el resto del proyecto
const fn = functions.region('us-central1');

type Payload = {
  spaceId: string;
};

/**
 * El proveedor elimina una plaza que aún está pendiente
 *  - Solo se permite si el estado es "pendiente" y es su propio anuncio
 */
export const deleteParkingSpace = fn.https.onCall(async (data: Payload, context) => {
  // 1) Autenticación
  const uid = context.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión');
  }

  // 2) Validación de argumentos
  const { spaceId } = data;
  if (!spaceId) {
    throw new functions.https.HttpsError('invalid-argument', 'Falta "spaceId"');
  }

  // 3) Verificar y eliminar la plaza
  const spaceRef = db.doc(`parkingSpaces/${spaceId}`);
  const snap = await spaceRef.get();

  if (!snap.exists) {
    throw new functions.https.HttpsError('not-found', 'La plaza no existe');
  }

  const space = snap.data() as any;
  if (space.providerId !== uid) {
    throw new functions.https.HttpsError('permission-denied', 'No eres el propietario de esta plaza');
  }
  if (space.status !== 'pendiente') {
    throw new functions.https.HttpsError('failed-precondition', 'Solo se pueden borrar plazas con estado "pendiente"');
  }

  await spaceRef.delete();
  return { ok: true };
});
