"use strict";
// functions/src/cancelParkingSpace.ts – versión corregida y lista para desplegar
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelParkingSpace = void 0;
const functions = __importStar(require("firebase-functions"));
const firebaseAdmin_1 = require("./utils/firebaseAdmin"); // instancia única
const expo_server_sdk_1 = require("expo-server-sdk");
const fn = functions.region('us-central1'); // misma región que el resto
const expo = new expo_server_sdk_1.Expo();
/**
 * El proveedor anula una reserva ya aceptada.
 * 1. Verifica auth y que el proveedor sea el dueño.
 * 2. Cambia status -> "cancelada" y elimina takerId.
 * 3. Resta 1 PARKCOIN al proveedor y suma contador de cancelaciones.
 * 4. Envía push al buscador y al proveedor.
 */
exports.cancelParkingSpace = fn.https.onCall(async (data, context) => {
    /* ───── 1) Autenticación ───── */
    const uid = context.auth?.uid;
    if (!uid)
        throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión');
    const { spaceId } = data;
    if (!spaceId)
        throw new functions.https.HttpsError('invalid-argument', 'Falta "spaceId"');
    /* ───── 2) Transacción ───── */
    await firebaseAdmin_1.db.runTransaction(async (tx) => {
        const ref = firebaseAdmin_1.db.doc(`parkingSpaces/${spaceId}`);
        const snap = await tx.get(ref);
        if (!snap.exists)
            throw new functions.https.HttpsError('not-found', 'La plaza no existe');
        const space = snap.data();
        if (space.providerId !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'No eres el propietario');
        }
        if (space.status !== 'reservada') {
            throw new functions.https.HttpsError('failed-precondition', 'Solo puedes anular reservas activas');
        }
        /* 2a. Actualiza la plaza */
        tx.update(ref, {
            status: 'cancelada',
            takerId: firebaseAdmin_1.admin.firestore.FieldValue.delete(),
        });
        /* 2b. Ajusta PARKCOINS y contador */
        const userRef = firebaseAdmin_1.db.doc(`users/${uid}`);
        tx.update(userRef, {
            parkcoins: firebaseAdmin_1.admin.firestore.FieldValue.increment(-1),
            cancellations: firebaseAdmin_1.admin.firestore.FieldValue.increment(1),
        });
    });
    /* ───── 3) Notificaciones push (fuera de la tx) ───── */
    try {
        const spaceSnap = await firebaseAdmin_1.db.doc(`parkingSpaces/${spaceId}`).get();
        const space = spaceSnap.data();
        const messages = [];
        if (space.takerPushToken && expo_server_sdk_1.Expo.isExpoPushToken(space.takerPushToken)) {
            messages.push({
                to: space.takerPushToken,
                title: 'Reserva cancelada',
                body: 'El conductor anuló la plaza que ibas a ocupar.',
            });
        }
        if (space.providerPushToken && expo_server_sdk_1.Expo.isExpoPushToken(space.providerPushToken)) {
            messages.push({
                to: space.providerPushToken,
                title: 'Has perdido 1 PARKCOIN',
                body: 'Si sigues cancelando, podrías ser penalizado.',
            });
        }
        for (const chunk of expo.chunkPushNotifications(messages)) {
            await expo.sendPushNotificationsAsync(chunk);
        }
    }
    catch (_) { /* ignoramos errores de push */ }
    return { ok: true };
});
//# sourceMappingURL=cancelParkingSpace.js.map