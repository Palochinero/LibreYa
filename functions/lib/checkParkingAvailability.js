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
exports.checkParkingAvailability = void 0;
const functions = __importStar(require("firebase-functions"));
const firebaseAdmin_1 = require("./utils/firebaseAdmin");
const fn = functions.region('us-central1');
exports.checkParkingAvailability = fn.https.onCall(async (data, context) => {
    // Verificar autenticación
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    const { latitude, longitude, radius = 1000 } = data;
    // Validar coordenadas
    if (!latitude || !longitude) {
        throw new functions.https.HttpsError('invalid-argument', 'Latitud y longitud son requeridas');
    }
    try {
        // Buscar plazas disponibles en el radio especificado
        const parkingSpacesRef = firebaseAdmin_1.db.collection('parkingSpaces');
        const query = parkingSpacesRef
            .where('status', '==', 'pendiente')
            .where('isScheduled', '==', false); // Solo plazas instantáneas
        const snapshot = await query.get();
        let availableSpaces = 0;
        const spacesInRange = [];
        // Calcular distancia para cada plaza encontrada
        snapshot.forEach((doc) => {
            const spaceData = doc.data();
            if (spaceData.latitude && spaceData.longitude) {
                const distance = calculateDistance(latitude, longitude, spaceData.latitude, spaceData.longitude);
                // Si está dentro del radio especificado
                if (distance <= radius) {
                    availableSpaces++;
                    spacesInRange.push(Object.assign({ id: doc.id, distance: Math.round(distance) }, spaceData));
                }
            }
        });
        // Ordenar por distancia
        spacesInRange.sort((a, b) => a.distance - b.distance);
        return {
            success: true,
            availableSpaces,
            spacesInRange: spacesInRange.slice(0, 5), // Solo las 5 más cercanas
            radius,
            userLocation: { latitude, longitude }
        };
    }
    catch (error) {
        console.error('Error checking parking availability:', error);
        throw new functions.https.HttpsError('internal', 'Error al verificar disponibilidad');
    }
});
// Función auxiliar para calcular distancia entre dos puntos (fórmula de Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distancia en metros
}
//# sourceMappingURL=checkParkingAvailability.js.map