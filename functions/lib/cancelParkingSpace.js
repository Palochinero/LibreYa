"use strict";
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
const admin = __importStar(require("firebase-admin"));
const expo_server_sdk_1 = require("expo-server-sdk");
admin.initializeApp();
const db = admin.firestore();
const expo = new expo_server_sdk_1.Expo();
// Helper para enviar push
async function sendPush(to, title, body) {
    if (!expo_server_sdk_1.Expo.isExpoPushToken(to))
        return;
    await expo.sendPushNotificationsAsync([{ to, title, body }]);
}
const fn = functions.region('us-central1');
exports.cancelParkingSpace = fn.https.onCall(async (data, context) => {
    /* 1. Autenticación */
    const uid = context.auth?.uid;
    if (!uid)
        throw new functions.https.HttpsError('unauthenticated', 'Necesitas iniciar sesión');
    /* 2. Validación del payload */
    const spaceId = data.spaceId;
    if (!spaceId)
        throw new functions.https.HttpsError('invalid-argument', 'Falta spaceId');
    /* 3. Transacción */
    await db.runTransaction(async (tx) => {
        const spaceRef = db.doc(`parkingSpaces/${spaceId}`);
        const snap = await tx.get(spaceRef);
        if (!snap.exists)
            throw new functions.https.HttpsError('not-found', 'Plaza no encontrada');
        const space = snap.data();
        // Debe ser el proveedor y la plaza debe estar reservada
        if (space.providerId !== uid || space.status !== 'reservada') {
            throw new functions.https.HttpsError('failed-precondition', 'No puedes anular esta plaza');
        }
        /* 3a. Cambiar estado y liberar takerId */
        tx.update(spaceRef, {
            status: 'cancelada',
            takerId: admin.firestore.FieldValue.delete(),
        });
        /* 3b. Quitar 1 PARKCOIN */
        const userRef = db.doc(`users/${uid}`);
        tx.update(userRef, {
            parkcoins: admin.firestore.FieldValue.increment(-1),
            cancellations: admin.firestore.FieldValue.increment(1),
        });
        /* 3c. Notificaciones push */
        const tasks = [];
        if (space.takerPushToken)
            tasks.push(sendPush(space.takerPushToken, 'Reserva cancelada', 'El conductor ha anulado la plaza que ibas a ocupar.'));
        if (space.providerPushToken)
            tasks.push(sendPush(space.providerPushToken, 'Has perdido 1 PARKCOIN', 'Si sigues cancelando podrías ser penalizado.'));
        await Promise.all(tasks);
    });
    return { ok: true };
});
//# sourceMappingURL=cancelParkingSpace.js.map