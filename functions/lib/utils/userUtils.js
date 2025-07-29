"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPointsToUser = addPointsToUser;
const admin = require("firebase-admin");
const firebase_functions_1 = require("firebase-functions");
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();
async function addPointsToUser(userId, pointsToAdd, reason, transaction) {
    var _a;
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
            const currentPoints = ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.points) || 0;
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