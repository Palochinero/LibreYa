"use strict";
// functions/src/cancelWithPenalty.ts – Función para cancelar con penalización
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
exports.cancelWithPenalty = void 0;
const functions = __importStar(require("firebase-functions"));
const expo_server_sdk_1 = require("expo-server-sdk");
const firebaseAdmin_1 = require("./utils/firebaseAdmin");
const fn = functions.region('us-central1');
const expo = new expo_server_sdk_1.Expo();
/**
 * Permite al conductor cancelar una plaza con penalización.
 * 1. Verifica que el conductor sea el taker.
 * 2. Resta 1 PARKCOIN al conductor.
 * 3. Notifica al proveedor para que pueda reportar si es necesario.
 * 4. Actualiza el estado de la plaza.
 */
exports.cancelWithPenalty = fn.https.onCall(async (data, context) => {
    var _a;
    /* ───── 1) Autenticación ───── */
    const uid = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid)
        throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión');
    const { spaceId, reason, details } = data;
    if (!spaceId || !reason) {
        throw new functions.https.HttpsError('invalid-argument', 'Faltan datos requeridos');
    }
    try {
        /* ───── 2) Verificar plaza y permisos ───── */
        const spaceRef = firebaseAdmin_1.db.doc(`parkingSpaces/${spaceId}`);
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
        await firebaseAdmin_1.db.runTransaction(async (tx) => {
            // Actualizar la plaza
            tx.update(spaceRef, {
                status: 'cancelada_penalizacion',
                takerId: firebaseAdmin_1.admin.firestore.FieldValue.delete(),
                cancelledAt: firebaseAdmin_1.admin.firestore.FieldValue.serverTimestamp(),
                cancellationReason: reason,
                cancellationDetails: details || '',
                cancelledBy: uid,
            });
            // Restar 1 PARKCOIN al conductor
            const userRef = firebaseAdmin_1.db.doc(`users/${uid}`);
            tx.update(userRef, {
                parkcoins: firebaseAdmin_1.admin.firestore.FieldValue.increment(-1),
                cancellations: firebaseAdmin_1.admin.firestore.FieldValue.increment(1),
                lastCancellationAt: firebaseAdmin_1.admin.firestore.FieldValue.serverTimestamp(),
            });
        });
        /* ───── 4) Notificar al proveedor ───── */
        try {
            const messages = [];
            if (spaceData.providerPushToken && expo_server_sdk_1.Expo.isExpoPushToken(spaceData.providerPushToken)) {
                let message = '';
                if (reason === 'found_better_plaza') {
                    message = 'El conductor canceló porque encontró otra plaza. Puedes reportarlo si no es justificado.';
                }
                else {
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
        }
        catch (error) {
            functions.logger.error('Error enviando notificaciones de cancelación:', error);
        }
        return {
            success: true,
            message: 'Plaza cancelada con penalización. Has perdido 1 PARKCOIN.',
            parkcoinsLost: 1,
            canBeReported: true
        };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        functions.logger.error('Error cancelando plaza con penalización:', error);
        throw new functions.https.HttpsError('internal', 'Error interno del servidor');
    }
});
//# sourceMappingURL=cancelWithPenalty.js.map