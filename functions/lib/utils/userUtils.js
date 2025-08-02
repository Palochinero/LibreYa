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
exports.addPointsToUser = addPointsToUser;
const admin = __importStar(require("firebase-admin"));
const firebase_functions_1 = require("firebase-functions");
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();
async function addPointsToUser(userId, pointsToAdd, reason, transaction) {
    const userRef = db.collection("users").doc(userId);
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    try {
        const userDoc = transaction ? await transaction.get(userRef) : await userRef.get();
        if (!userDoc.exists) {
            firebase_functions_1.logger.warn(`User ${userId} not found. Creating profile.`);
            const newUserProfile = {
                userId: userId,
                createdAt: timestamp,
                points: pointsToAdd,
                reputation: pointsToAdd,
                pointsHistory: [{ amount: pointsToAdd, reason, timestamp }],
                isPremium: false,
                premiumExpiryDate: null,
            };
            if (transaction) {
                transaction.set(userRef, newUserProfile);
            }
            else {
                await userRef.set(newUserProfile);
            }
        }
        else {
            const currentPoints = userDoc.data()?.points || 0;
            const newPoints = currentPoints + pointsToAdd;
            const updateData = {
                points: newPoints,
                reputation: newPoints, // Simplificado: reputación = puntos
                pointsHistory: admin.firestore.FieldValue.arrayUnion({
                    amount: pointsToAdd,
                    reason,
                    timestamp,
                }),
            };
            if (transaction) {
                transaction.update(userRef, updateData);
            }
            else {
                await userRef.update(updateData);
            }
        }
        firebase_functions_1.logger.log(`Added ${pointsToAdd} points to user ${userId} for: ${reason}.`);
    }
    catch (error) {
        firebase_functions_1.logger.error(`Failed to add points to user ${userId}:`, error);
        throw error;
    }
}
//# sourceMappingURL=userUtils.js.map