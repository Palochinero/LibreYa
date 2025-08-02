"use strict";
// functions/src/penalizeAbusers.ts – Función para penalizar usuarios abusivos
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
exports.penalizeAbusers = void 0;
const functions = __importStar(require("firebase-functions"));
const firebaseAdmin_1 = require("./utils/firebaseAdmin");
const fn = functions.region('us-central1');
/**
 * Tarea programada diaria que penaliza usuarios que cancelan demasiado.
 * Se ejecuta cada día a las 2:00 AM y revisa usuarios con más de 3 cancelaciones
 * en las últimas 24 horas. Reduce su reputación o los suspende.
 */
exports.penalizeAbusers = fn.pubsub
    .schedule('0 2 * * *') // Cada día a las 2:00 AM
    .onRun(async (context) => {
    const now = firebaseAdmin_1.admin.firestore.Timestamp.now();
    const yesterday = new Date(now.toDate().getTime() - 24 * 60 * 60 * 1000);
    const yesterdayTimestamp = firebaseAdmin_1.admin.firestore.Timestamp.fromDate(yesterday);
    let penalizedCount = 0;
    let suspendedCount = 0;
    try {
        // Buscar usuarios con más de 3 cancelaciones en las últimas 24h
        const usersQuery = firebaseAdmin_1.db.collection('users');
        const usersSnapshot = await usersQuery.get();
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const userId = userDoc.id;
            // Contar cancelaciones en las últimas 24h
            const cancellationsQuery = firebaseAdmin_1.db
                .collection('parkingSpaces')
                .where('providerId', '==', userId)
                .where('status', '==', 'cancelada')
                .where('updatedAt', '>=', yesterdayTimestamp);
            const cancellationsSnapshot = await cancellationsQuery.get();
            const recentCancellations = cancellationsSnapshot.size;
            if (recentCancellations >= 3) {
                const userRef = firebaseAdmin_1.db.doc(`users/${userId}`);
                const currentReputation = userData.reputation || 0;
                const currentCancellations = userData.cancellations || 0;
                // Penalizar según la gravedad
                if (recentCancellations >= 5) {
                    // Suspender usuario por abuso grave
                    await userRef.update({
                        suspended: true,
                        suspendedAt: now,
                        suspendedReason: `Demasiadas cancelaciones: ${recentCancellations} en 24h`,
                        reputation: Math.max(0, currentReputation - 10),
                        cancellations: currentCancellations + recentCancellations
                    });
                    suspendedCount++;
                    functions.logger.warn(`Usuario ${userId} suspendido por ${recentCancellations} cancelaciones`);
                }
                else {
                    // Reducir reputación
                    await userRef.update({
                        reputation: Math.max(0, currentReputation - 5),
                        cancellations: currentCancellations + recentCancellations,
                        lastPenalty: now,
                        penaltyReason: `Demasiadas cancelaciones: ${recentCancellations} en 24h`
                    });
                    penalizedCount++;
                    functions.logger.info(`Usuario ${userId} penalizado: -5 reputación`);
                }
            }
        }
        functions.logger.info(`Proceso de penalización completado: ${penalizedCount} penalizados, ${suspendedCount} suspendidos`);
        return {
            success: true,
            penalizedCount,
            suspendedCount,
            timestamp: now.toDate().toISOString()
        };
    }
    catch (error) {
        functions.logger.error('Error en proceso de penalización:', error);
        throw error;
    }
});
//# sourceMappingURL=penalizeAbusers.js.map