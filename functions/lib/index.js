"use strict";
// functions/src/index.ts  ✅ limpio
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
exports.checkParkingAvailability = exports.checkPublishLimits = exports.cancelWithPenalty = exports.getTrackingInfo = exports.trackParkingSpace = exports.geoIndexParkingSpace = exports.reportUser = exports.penalizeAbusers = exports.autoExpireParkingSpace = exports.completeParkingSpace = exports.deleteParkingSpace = exports.cancelParkingSpace = exports.findAndAssignParkingSpace = exports.publishParkingSpace = void 0;
const functions = __importStar(require("firebase-functions"));
const geohash = __importStar(require("ngeohash")); // ← IMPORT CORRECTO
const firebaseAdmin_1 = require("./utils/firebaseAdmin"); // ← usa la instancia única
const region = functions.region('us-central1'); // misma región que en el front
/* ─────────── utilidades ─────────── */
const toRad = (deg) => (deg * Math.PI) / 180;
const haversine = (Lat1, Lon1, Lat2, Lon2) => {
    const R = 6371; // km
    const dLat = toRad(Lat2 - Lat1);
    const dLon = toRad(Lon2 - Lon1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(Lat1)) * Math.cos(toRad(Lat2)) *
            Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
const iso = (d) => new Date(d).toISOString().slice(0, 19);
/* ─────────── FUNCTIONS EXPORTABLES ─────────── */
// Publicar una nueva plaza de estacionamiento
exports.publishParkingSpace = region.https.onCall(async (data, context) => {
    var _a;
    const uid = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid)
        throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión');
    const { address, latitude, longitude, price, startTime, endTime, description, isScheduled = false } = data;
    if (!address || !latitude || !longitude || !price || !startTime) {
        throw new functions.https.HttpsError('invalid-argument', 'Faltan datos requeridos');
    }
    try {
        /* ───── 1) Verificar límites de publicación ───── */
        const userRef = firebaseAdmin_1.db.doc(`users/${uid}`);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Usuario no encontrado');
        }
        const userData = userSnap.data();
        const userPlan = userData.plan || 'free';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Contar publicaciones de hoy
        const todayPublicationsQuery = await firebaseAdmin_1.db.collection('parkingSpaces')
            .where('providerId', '==', uid)
            .where('createdAt', '>=', firebaseAdmin_1.admin.firestore.Timestamp.fromDate(today))
            .get();
        const todayPublications = todayPublicationsQuery.size;
        // Verificar límites según el plan
        let canPublish = false;
        let dailyLimit = 1;
        switch (userPlan) {
            case 'free':
                dailyLimit = 1;
                canPublish = todayPublications < dailyLimit;
                break;
            case 'premium':
                canPublish = true; // Sin límites
                break;
            case 'ad_supported':
                const adsWatched = userData.adsWatchedToday || 0;
                dailyLimit = 1 + (adsWatched * 2);
                canPublish = todayPublications < dailyLimit;
                break;
            default:
                dailyLimit = 1;
                canPublish = todayPublications < dailyLimit;
        }
        if (!canPublish) {
            throw new functions.https.HttpsError('resource-exhausted', `Has alcanzado el límite diario de ${dailyLimit} publicación(es). ` +
                (userPlan === 'free' ? 'Actualiza a Premium por €5/mes para publicar sin límites.' :
                    'Ve más anuncios o actualiza a Premium para publicar más.'));
        }
        /* ───── 2) Crear la plaza ───── */
        const parkingSpaceData = {
            providerId: uid,
            address,
            latitude,
            longitude,
            price: parseFloat(price),
            startTime: firebaseAdmin_1.admin.firestore.Timestamp.fromDate(new Date(startTime)),
            endTime: endTime ? firebaseAdmin_1.admin.firestore.Timestamp.fromDate(new Date(endTime)) : null,
            description: description || '',
            status: 'pendiente',
            isScheduled: Boolean(isScheduled), // Campo para distinguir plazas instantáneas vs programadas
            createdAt: firebaseAdmin_1.admin.firestore.FieldValue.serverTimestamp(),
            geohash: geohash.encode(latitude, longitude, 9),
        };
        const docRef = await firebaseAdmin_1.db.collection('parkingSpaces').add(parkingSpaceData);
        return {
            success: true,
            spaceId: docRef.id,
            message: 'Plaza publicada correctamente',
            isScheduled: Boolean(isScheduled),
            todayPublications: todayPublications + 1,
            dailyLimit
        };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Error al publicar la plaza');
    }
});
// Buscar y asignar una plaza de estacionamiento
exports.findAndAssignParkingSpace = region.https.onCall(async (data, context) => {
    var _a;
    const uid = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid)
        throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión');
    const { latitude, longitude, maxDistance = 5 } = data; // maxDistance en km
    if (!latitude || !longitude) {
        throw new functions.https.HttpsError('invalid-argument', 'Se requieren coordenadas');
    }
    try {
        // Buscar plazas disponibles cerca de la ubicación
        const geohashPrefix = geohash.encode(latitude, longitude, 6);
        const parkingSpacesRef = firebaseAdmin_1.db.collection('parkingSpaces');
        const query = parkingSpacesRef
            .where('status', '==', 'pendiente')
            .where('geohash', '>=', geohashPrefix)
            .where('geohash', '<=', geohashPrefix + '\uf8ff')
            .limit(10);
        const snapshot = await query.get();
        const availableSpaces = [];
        snapshot.forEach(doc => {
            const space = doc.data();
            const distance = haversine(latitude, longitude, space.latitude, space.longitude);
            if (distance <= maxDistance) {
                availableSpaces.push(Object.assign(Object.assign({ id: doc.id }, space), { distance }));
            }
        });
        // Ordenar por distancia
        availableSpaces.sort((a, b) => a.distance - b.distance);
        if (availableSpaces.length === 0) {
            return {
                success: false,
                message: 'No se encontraron plazas disponibles en tu área'
            };
        }
        // Intentar reservar la plaza más cercana
        const bestSpace = availableSpaces[0];
        const spaceRef = firebaseAdmin_1.db.doc(`parkingSpaces/${bestSpace.id}`);
        const result = await firebaseAdmin_1.db.runTransaction(async (tx) => {
            const spaceDoc = await tx.get(spaceRef);
            if (!spaceDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'La plaza ya no está disponible');
            }
            const spaceData = spaceDoc.data();
            if (!spaceData || spaceData.status !== 'pendiente') {
                throw new functions.https.HttpsError('failed-precondition', 'La plaza ya fue reservada');
            }
            // Reservar la plaza
            tx.update(spaceRef, {
                status: 'reservada',
                takerId: uid,
                reservedAt: firebaseAdmin_1.admin.firestore.FieldValue.serverTimestamp(),
            });
            return {
                success: true,
                spaceId: bestSpace.id,
                space: Object.assign(Object.assign({}, bestSpace), { status: 'reservada', takerId: uid }),
                message: 'Plaza reservada correctamente'
            };
        });
        return result;
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Error al buscar plazas');
    }
});
// Nueva: cancelParkingSpace  (importada desde su módulo)
var cancelParkingSpace_1 = require("./cancelParkingSpace");
Object.defineProperty(exports, "cancelParkingSpace", { enumerable: true, get: function () { return cancelParkingSpace_1.cancelParkingSpace; } });
// Nueva: deleteParkingSpace  (importada desde su módulo)
var deleteParkingSpace_1 = require("./deleteParkingSpace");
Object.defineProperty(exports, "deleteParkingSpace", { enumerable: true, get: function () { return deleteParkingSpace_1.deleteParkingSpace; } });
// Completar una reserva de plaza
exports.completeParkingSpace = region.https.onCall(async (data, context) => {
    var _a;
    const uid = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid)
        throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión');
    const { spaceId } = data;
    if (!spaceId)
        throw new functions.https.HttpsError('invalid-argument', 'Falta "spaceId"');
    try {
        await firebaseAdmin_1.db.runTransaction(async (tx) => {
            const spaceRef = firebaseAdmin_1.db.doc(`parkingSpaces/${spaceId}`);
            const spaceSnap = await tx.get(spaceRef);
            if (!spaceSnap.exists) {
                throw new functions.https.HttpsError('not-found', 'La plaza no existe');
            }
            const space = spaceSnap.data();
            if (!space || space.takerId !== uid) {
                throw new functions.https.HttpsError('permission-denied', 'No eres el conductor de esta reserva');
            }
            if (!space || space.status !== 'reservada') {
                throw new functions.https.HttpsError('failed-precondition', 'Solo puedes completar reservas activas');
            }
            // Marcar como completada
            tx.update(spaceRef, {
                status: 'completada',
                completedAt: firebaseAdmin_1.admin.firestore.FieldValue.serverTimestamp(),
            });
            // Dar PARKCOINS al proveedor
            const providerRef = firebaseAdmin_1.db.doc(`users/${space.providerId}`);
            tx.update(providerRef, {
                parkcoins: firebaseAdmin_1.admin.firestore.FieldValue.increment(1),
            });
        });
        return { success: true, message: 'Reserva completada correctamente' };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Error al completar la reserva');
    }
});
// ─────────── NUEVAS FUNCIONES AGREGADAS ───────────
// Auto-expirar plazas programadas (tarea programada)
var autoExpireParkingSpace_1 = require("./autoExpireParkingSpace");
Object.defineProperty(exports, "autoExpireParkingSpace", { enumerable: true, get: function () { return autoExpireParkingSpace_1.autoExpireParkingSpace; } });
// Penalizar usuarios abusivos (tarea programada diaria)
var penalizeAbusers_1 = require("./penalizeAbusers");
Object.defineProperty(exports, "penalizeAbusers", { enumerable: true, get: function () { return penalizeAbusers_1.penalizeAbusers; } });
// Reportar usuarios problemáticos
var reportUser_1 = require("./reportUser");
Object.defineProperty(exports, "reportUser", { enumerable: true, get: function () { return reportUser_1.reportUser; } });
// Generar índices geográficos automáticamente (trigger)
var geoIndexParkingSpace_1 = require("./geoIndexParkingSpace");
Object.defineProperty(exports, "geoIndexParkingSpace", { enumerable: true, get: function () { return geoIndexParkingSpace_1.geoIndexParkingSpace; } });
// ─────────── FUNCIONES DE SEGUIMIENTO EN TIEMPO REAL ───────────
// Actualizar ubicación del conductor en tiempo real
var trackParkingSpace_1 = require("./trackParkingSpace");
Object.defineProperty(exports, "trackParkingSpace", { enumerable: true, get: function () { return trackParkingSpace_1.trackParkingSpace; } });
// Obtener información de seguimiento
var getTrackingInfo_1 = require("./getTrackingInfo");
Object.defineProperty(exports, "getTrackingInfo", { enumerable: true, get: function () { return getTrackingInfo_1.getTrackingInfo; } });
// ─────────── FUNCIONES DE REPORTES Y LÍMITES ───────────
// Cancelar plaza con penalización
var cancelWithPenalty_1 = require("./cancelWithPenalty");
Object.defineProperty(exports, "cancelWithPenalty", { enumerable: true, get: function () { return cancelWithPenalty_1.cancelWithPenalty; } });
// Verificar límites de publicación
var checkPublishLimits_1 = require("./checkPublishLimits");
Object.defineProperty(exports, "checkPublishLimits", { enumerable: true, get: function () { return checkPublishLimits_1.checkPublishLimits; } });
// ─────────── FUNCIONES DE DISPONIBILIDAD ───────────
// Verificar disponibilidad de plazas en una zona
var checkParkingAvailability_1 = require("./checkParkingAvailability");
Object.defineProperty(exports, "checkParkingAvailability", { enumerable: true, get: function () { return checkParkingAvailability_1.checkParkingAvailability; } });
//# sourceMappingURL=index.js.map