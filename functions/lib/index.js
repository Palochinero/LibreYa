"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAndAssignParkingSpace = exports.publishParkingSpace = void 0;
// functions/index.ts  ✅ limpio
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const geohash = require("ngeohash"); // ← IMPORT CORRECTO
admin.initializeApp();
const db = admin.firestore();
const region = functions.region('us-central1'); // misma región que usas en el front
/* ───────── utilidades ───────── */
const toRad = (deg) => (deg * Math.PI) / 180;
const haversine = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};
const ts = (iso) => iso ? admin.firestore.Timestamp.fromDate(new Date(iso)) : null;
/* ───────── publishParkingSpace (CALLABLE) ───────── */
exports.publishParkingSpace = region.https.onCall(async (data, context) => {
    try {
        /* ── validaciones básicas ── */
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión');
        }
        const { latitude, longitude, description, scheduledAt = null, address = null, } = data || {};
        if (typeof latitude !== 'number' ||
            typeof longitude !== 'number' ||
            !description) {
            throw new functions.https.HttpsError('invalid-argument', 'Datos inválidos');
        }
        /* ── calcula geohash y guarda ── */
        const hash = geohash.encode(latitude, longitude);
        const doc = await db.collection('parkingSpaces').add({
            latitude,
            longitude,
            geohash: hash,
            providerId: context.auth.uid,
            description,
            scheduledAt: ts(scheduledAt),
            status: 'pendiente',
            address,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { parkingSpaceId: doc.id }; // ⇢ llega al front
    }
    catch (err) {
        console.error('publishParkingSpace:', err);
        throw err instanceof functions.https.HttpsError
            ? err
            : new functions.https.HttpsError('internal', err.message || 'Error interno');
    }
});
/* ───────── findAndAssignParkingSpace (CALLABLE) ───────── */
exports.findAndAssignParkingSpace = region.https.onCall(async (data, _ctx) => {
    try {
        const { latitude, longitude } = data || {};
        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            throw new functions.https.HttpsError('invalid-argument', 'Coordenadas inválidas');
        }
        const snap = await db
            .collection('parkingSpaces')
            .where('status', '==', 'pendiente')
            .get();
        let bestId = null;
        let bestDist = Infinity;
        snap.forEach((doc) => {
            const d = doc.data();
            const dist = haversine(latitude, longitude, d.latitude, d.longitude);
            if (dist < bestDist) {
                bestDist = dist;
                bestId = doc.id;
            }
        });
        if (!bestId) {
            throw new functions.https.HttpsError('not-found', 'No hay plazas disponibles');
        }
        await db.doc(`parkingSpaces/${bestId}`).update({ status: 'reservada' });
        return { parkingSpaceId: bestId, distance: bestDist };
    }
    catch (err) {
        console.error('findAndAssignParkingSpace:', err);
        throw err instanceof functions.https.HttpsError
            ? err
            : new functions.https.HttpsError('internal', err.message || 'Error interno');
    }
});
//# sourceMappingURL=index.js.map