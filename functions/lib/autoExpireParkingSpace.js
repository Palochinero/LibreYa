"use strict";
// functions/src/autoExpireParkingSpace.ts – Función para expirar plazas automáticamente
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
exports.autoExpireParkingSpace = void 0;
const functions = __importStar(require("firebase-functions"));
const firebaseAdmin_1 = require("./utils/firebaseAdmin");
const fn = functions.region('us-central1');
/**
 * Tarea programada que expira plazas pendientes cuyo tiempo ya pasó.
 * Se ejecuta cada 5 minutos y busca plazas con scheduledTime vencida.
 * Cambia su status a 'expirada' para mantener historial.
 */
exports.autoExpireParkingSpace = fn.pubsub
    .schedule('every 5 minutes')
    .onRun(async (context) => {
    const now = firebaseAdmin_1.admin.firestore.Timestamp.now();
    const batch = firebaseAdmin_1.db.batch();
    let expiredCount = 0;
    try {
        // Buscar plazas pendientes cuya scheduledTime ya pasó
        const expiredSpacesQuery = firebaseAdmin_1.db
            .collection('parkingSpaces')
            .where('status', '==', 'pendiente')
            .where('scheduledTime', '<', now);
        const snapshot = await expiredSpacesQuery.get();
        if (snapshot.empty) {
            functions.logger.info('No hay plazas expiradas para procesar');
            return null;
        }
        // Procesar cada plaza expirada
        snapshot.forEach((doc) => {
            const spaceData = doc.data();
            const spaceRef = doc.ref;
            // Marcar como expirada
            batch.update(spaceRef, {
                status: 'expirada',
                expiredAt: now,
                expiredReason: 'Tiempo programado vencido'
            });
            expiredCount++;
            functions.logger.info(`Plaza ${doc.id} marcada como expirada`);
        });
        // Ejecutar batch update
        if (expiredCount > 0) {
            await batch.commit();
            functions.logger.info(`Se expiraron ${expiredCount} plazas automáticamente`);
        }
        return {
            success: true,
            expiredCount,
            timestamp: now.toDate().toISOString()
        };
    }
    catch (error) {
        functions.logger.error('Error expirando plazas automáticamente:', error);
        throw error;
    }
});
//# sourceMappingURL=autoExpireParkingSpace.js.map