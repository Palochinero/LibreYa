"use strict";
// functions/src/completeParkingSpace.ts – Función para completar reserva de plaza
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
exports.completeParkingSpace = void 0;
const functions = __importStar(require("firebase-functions"));
const expo_server_sdk_1 = require("expo-server-sdk");
const firebaseAdmin_1 = require("./utils/firebaseAdmin");
const userUtils_1 = require("./utils/userUtils");
const fn = functions.region('us-central1');
const expo = new expo_server_sdk_1.Expo();
/**
 * El conductor marca que ya ocupó la plaza.
 * 1. Verifica auth y que el conductor sea el taker.
 * 2. Cambia status -> "completada".
 * 3. Suma 1 PARKCOIN al proveedor.
 * 4. Envía push al proveedor y al conductor.
 */
exports.completeParkingSpace = fn.https.onCall(async (data, context) => {
    var _a;
    /* ───── 1) Autenticación ───── */
    const uid = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid)
        throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión');
    const { spaceId } = data;
    if (!spaceId)
        throw new functions.https.HttpsError('invalid-argument', 'Falta "spaceId"');
    /* ───── 2) Transacción ───── */
    let spaceData;
    let providerId;
    await firebaseAdmin_1.db.runTransaction(async (tx) => {
        const spaceRef = firebaseAdmin_1.db.doc(`parkingSpaces/${spaceId}`);
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
            completedAt: firebaseAdmin_1.admin.firestore.FieldValue.serverTimestamp(),
        });
        /* 2b. Dar PARKCOIN al proveedor */
        await (0, userUtils_1.addPointsToUser)(providerId, 1, 'Plaza completada por conductor', tx);
    });
    /* ───── 3) Notificaciones push (fuera de la tx) ───── */
    try {
        const messages = [];
        // Push al proveedor
        if (spaceData.providerPushToken && expo_server_sdk_1.Expo.isExpoPushToken(spaceData.providerPushToken)) {
            messages.push({
                to: spaceData.providerPushToken,
                title: '¡Plaza completada!',
                body: `Has ganado 1 PARKCOIN. El conductor completó el uso de tu plaza.`,
                data: { spaceId, type: 'completion' },
            });
        }
        // Push al conductor
        if (spaceData.takerPushToken && expo_server_sdk_1.Expo.isExpoPushToken(spaceData.takerPushToken)) {
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
    }
    catch (error) {
        functions.logger.error('Error enviando notificaciones push:', error);
    }
    return {
        success: true,
        message: 'Plaza completada correctamente',
        parkcoinsEarned: 1
    };
});
//# sourceMappingURL=completeParkingSpace.js.map