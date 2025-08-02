"use strict";
// functions/src/geoIndexParkingSpace.ts – Trigger para generar índices geográficos
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
exports.geoIndexParkingSpace = void 0;
const functions = __importStar(require("firebase-functions"));
const geohash = __importStar(require("ngeohash"));
const firebaseAdmin_1 = require("./utils/firebaseAdmin");
const fn = functions.region('us-central1');
/**
 * Trigger que se ejecuta cada vez que se crea o edita un parkingSpace.
 * Genera automáticamente un campo geoHash basado en lat/lng para búsquedas eficientes.
 *
 * El geoHash se calcula con precisión 9 (aproximadamente 5m x 5m) para búsquedas
 * precisas pero no demasiado granulares.
 */
exports.geoIndexParkingSpace = fn.firestore
    .document('parkingSpaces/{spaceId}')
    .onWrite(async (change, context) => {
    const spaceId = context.params.spaceId;
    // Si el documento fue eliminado, no hacer nada
    if (!change.after.exists) {
        functions.logger.info(`Documento ${spaceId} eliminado, no se genera geoHash`);
        return null;
    }
    const newData = change.after.data();
    const oldData = change.before.exists ? change.before.data() : null;
    // Solo procesar si hay coordenadas válidas
    if (!newData || !newData.latitude || !newData.longitude) {
        functions.logger.warn(`Documento ${spaceId} sin coordenadas válidas`);
        return null;
    }
    const { latitude, longitude } = newData;
    const newGeoHash = geohash.encode(latitude, longitude, 9); // Precisión 9
    // Verificar si el geoHash cambió
    const oldGeoHash = oldData?.geoHash;
    if (oldGeoHash === newGeoHash) {
        functions.logger.info(`GeoHash no cambió para ${spaceId}: ${newGeoHash}`);
        return null;
    }
    try {
        // Actualizar el documento con el nuevo geoHash
        await change.after.ref.update({
            geoHash: newGeoHash,
            geoHashPrecision: 9,
            lastGeoIndexUpdate: firebaseAdmin_1.admin.firestore.FieldValue.serverTimestamp()
        });
        functions.logger.info(`GeoHash actualizado para ${spaceId}: ${oldGeoHash} -> ${newGeoHash}`);
        return {
            success: true,
            spaceId,
            oldGeoHash,
            newGeoHash,
            latitude,
            longitude
        };
    }
    catch (error) {
        functions.logger.error(`Error actualizando geoHash para ${spaceId}:`, error);
        throw error;
    }
});
//# sourceMappingURL=geoIndexParkingSpace.js.map