// functions/index.ts – Versión depurada ✅ para SDK v2
// Incluye:
//   • importación correcta de `ngeohash` (funciona encode/decode)
//   • función HTTP publishParkingSpace
//   • helpers para validación mínima y escritura en Firestore
//   • ejemplo de findAndAssignParkingSpace (distancia + reserva)
// Ajusta IDs de colección o lógica según tu modelo.

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import geohash from 'ngeohash'; // 👈  ESTA ES LA IMPORTACIÓN CORRECTA
a
admin.initializeApp();
const db = admin.firestore();

/*──────────────────── utilities ────────────────────*/
const toRad = (value: number) => (value * Math.PI) / 180;
function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/*──────────────────── publishParkingSpace ────────────────────*/
export const publishParkingSpace = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const {
      latitude,
      longitude,
      providerId,
      description,
      scheduledAt = null,
      status = 'pendiente',
      address = null,
    } = req.body;

    if (
      latitude === undefined ||
      longitude === undefined ||
      providerId === undefined ||
      description === undefined
    ) {
      return res.status(400).send('Missing required fields');
    }

    const hash = geohash.encode(latitude, longitude);

    const docRef = await db.collection('parkingSpaces').add({
      latitude,
      longitude,
      geohash: hash,
      providerId,
      description,
      scheduledAt: scheduledAt ? admin.firestore.Timestamp.fromDate(new Date(scheduledAt)) : null,
      status,
      address,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.send({ parkingSpaceId: docRef.id });
  } catch (e) {
    console.error(e);
    return res.status(500).send('internal');
  }
});

/*──────────────────── findAndAssignParkingSpace ────────────────────*/
export const findAndAssignParkingSpace = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
    const { latitude, longitude } = req.body;
    if (latitude === undefined || longitude === undefined) return res.status(400).send('Missing coords');

    // Busca las plazas pendientes.
    const snapshot = await db
      .collection('parkingSpaces')
      .where('status', '==', 'pendiente')
      .get();

    let bestId: string | null = null;
    let bestDist = Infinity;

    snapshot.forEach((doc) => {
      const d = doc.data() as any;
      const dist = haversine(latitude, longitude, d.latitude, d.longitude);
      if (dist < bestDist) {
        bestDist = dist;
        bestId = doc.id;
      }
    });

    if (!bestId) return res.status(404).send('No parking available');

    // Marca como reservada
    await db.collection('parkingSpaces').doc(bestId).update({ status: 'reservada' });
    return res.send({ parkingSpaceId: bestId, distance: bestDist });
  } catch (e) {
    console.error(e);
    return res.status(500).send('internal');
  }
});
