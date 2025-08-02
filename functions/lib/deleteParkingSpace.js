"use strict";
// functions/src/deleteParkingSpace.ts – versión corregida
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
exports.deleteParkingSpace = void 0;
const functions = __importStar(require("firebase-functions"));
const firebaseAdmin_1 = require("./utils/firebaseAdmin"); // instancia única
// Reutilizamos la misma región que en el resto del proyecto
const fn = functions.region('us-central1');
/**
 * El proveedor elimina una plaza que aún está pendiente
 *  - Solo se permite si el estado es "pendiente" y es su propio anuncio
 */
exports.deleteParkingSpace = fn.https.onCall(async (data, context) => {
    // 1) Autenticación
    const uid = context.auth?.uid;
    if (!uid) {
        throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión');
    }
    // 2) Validación de argumentos
    const { spaceId } = data;
    if (!spaceId) {
        throw new functions.https.HttpsError('invalid-argument', 'Falta "spaceId"');
    }
    // 3) Verificar y eliminar la plaza
    const spaceRef = firebaseAdmin_1.db.doc(`parkingSpaces/${spaceId}`);
    const snap = await spaceRef.get();
    if (!snap.exists) {
        throw new functions.https.HttpsError('not-found', 'La plaza no existe');
    }
    const space = snap.data();
    if (space.providerId !== uid) {
        throw new functions.https.HttpsError('permission-denied', 'No eres el propietario de esta plaza');
    }
    if (space.status !== 'pendiente') {
        throw new functions.https.HttpsError('failed-precondition', 'Solo se pueden borrar plazas con estado "pendiente"');
    }
    await spaceRef.delete();
    return { ok: true };
});
//# sourceMappingURL=deleteParkingSpace.js.map