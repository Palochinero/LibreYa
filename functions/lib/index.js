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
exports.deleteParkingSpace = exports.cancelParkingSpace = exports.findAndAssignParkingSpace = exports.publishParkingSpace = void 0;
const functions = __importStar(require("firebase-functions"));
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
// Ejemplo: publishParkingSpace (tal como ya lo tenías)
exports.publishParkingSpace = region.https.onCall(async (data, context) => {
    // ... tu lógica actual ...
});
// Ejemplo: findAndAssignParkingSpace
exports.findAndAssignParkingSpace = region.https.onCall(async (data, context) => {
    // ... tu lógica actual ...
});
// Nueva: cancelParkingSpace  (importada desde su módulo)
var cancelParkingSpace_1 = require("./cancelParkingSpace");
Object.defineProperty(exports, "cancelParkingSpace", { enumerable: true, get: function () { return cancelParkingSpace_1.cancelParkingSpace; } });
// Nueva: deleteParkingSpace  (importada desde su módulo)
var deleteParkingSpace_1 = require("./deleteParkingSpace");
Object.defineProperty(exports, "deleteParkingSpace", { enumerable: true, get: function () { return deleteParkingSpace_1.deleteParkingSpace; } });
//# sourceMappingURL=index.js.map