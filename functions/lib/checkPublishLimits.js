"use strict";
// functions/src/checkPublishLimits.ts – Función para verificar límites de publicación
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
exports.checkPublishLimits = void 0;
const functions = __importStar(require("firebase-functions"));
const firebaseAdmin_1 = require("./utils/firebaseAdmin");
const fn = functions.region('us-central1');
/**
 * Verifica los límites de publicación según el plan del usuario.
 * 1. Free Plan: 1 plaza por día
 * 2. Premium Plan: Sin límites
 * 3. Con anuncios: +2 plazas por anuncio visto
 */
exports.checkPublishLimits = fn.https.onCall(async (data, context) => {
    var _a;
    /* ───── 1) Autenticación ───── */
    const uid = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid)
        throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión');
    const { userId } = data;
    if (!userId) {
        throw new functions.https.HttpsError('invalid-argument', 'Falta "userId"');
    }
    try {
        /* ───── 2) Obtener información del usuario ───── */
        const userRef = firebaseAdmin_1.db.doc(`users/${userId}`);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Usuario no encontrado');
        }
        const userData = userSnap.data();
        if (!userData) {
            throw new functions.https.HttpsError('not-found', 'Datos de usuario no encontrados');
        }
        /* ───── 3) Verificar plan y límites ───── */
        const userPlan = userData.plan || 'free';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Contar publicaciones de hoy
        const todayPublicationsQuery = await firebaseAdmin_1.db.collection('parkingSpaces')
            .where('providerId', '==', userId)
            .where('createdAt', '>=', firebaseAdmin_1.admin.firestore.Timestamp.fromDate(today))
            .get();
        const todayPublications = todayPublicationsQuery.size;
        // Límites según el plan
        let dailyLimit = 1; // Free plan por defecto
        let canPublish = false;
        let reason = '';
        let upgradeMessage = '';
        switch (userPlan) {
            case 'free':
                dailyLimit = 1;
                canPublish = todayPublications < dailyLimit;
                if (!canPublish) {
                    reason = 'Límite diario alcanzado';
                    upgradeMessage = 'Actualiza a Premium por €5/mes para publicar sin límites y recibir 10 PARKCOINS';
                }
                break;
            case 'premium':
                dailyLimit = -1; // Sin límites
                canPublish = true;
                break;
            case 'ad_supported':
                // Free + anuncios vistos
                const adsWatched = userData.adsWatchedToday || 0;
                dailyLimit = 1 + (adsWatched * 2); // +2 por anuncio
                canPublish = todayPublications < dailyLimit;
                if (!canPublish) {
                    reason = 'Límite diario alcanzado';
                    upgradeMessage = 'Ve más anuncios o actualiza a Premium para publicar más';
                }
                break;
            default:
                dailyLimit = 1;
                canPublish = todayPublications < dailyLimit;
                if (!canPublish) {
                    reason = 'Límite diario alcanzado';
                    upgradeMessage = 'Actualiza a Premium por €5/mes para publicar sin límites';
                }
        }
        /* ───── 4) Información adicional para anuncios ───── */
        let adInfo = null;
        if (userPlan === 'ad_supported' && !canPublish) {
            const adsNeeded = Math.ceil((todayPublications - dailyLimit + 1) / 2);
            adInfo = {
                adsWatchedToday: userData.adsWatchedToday || 0,
                adsNeeded,
                adsRemaining: Math.max(0, 5 - (userData.adsWatchedToday || 0)) // Máximo 5 anuncios por día
            };
        }
        return {
            success: true,
            canPublish,
            userPlan,
            todayPublications,
            dailyLimit,
            reason,
            upgradeMessage,
            adInfo,
            premiumPrice: 5,
            premiumParkcoins: 10
        };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        functions.logger.error('Error verificando límites de publicación:', error);
        throw new functions.https.HttpsError('internal', 'Error interno del servidor');
    }
});
//# sourceMappingURL=checkPublishLimits.js.map