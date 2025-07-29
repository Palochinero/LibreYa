import * as admin from "firebase-admin";
import { logger } from "firebase-functions";

if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

export async function addPointsToUser(
  userId: string,
  pointsToAdd: number,
  reason: string,
  transaction?: admin.firestore.Transaction
): Promise<void> {
  const userRef = db.collection("users").doc(userId);
  const timestamp = admin.firestore.FieldValue.serverTimestamp();

  try {
    const userDoc = transaction ? await transaction.get(userRef) : await userRef.get();

    if (!userDoc.exists) {
        logger.warn(`User ${userId} not found. Creating profile.`);
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
        } else {
          await userRef.set(newUserProfile);
        }
    } else {
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
        } else {
            await userRef.update(updateData);
        }
    }
    logger.log(`Added ${pointsToAdd} points to user ${userId} for: ${reason}.`);
  } catch (error) {
    logger.error(`Failed to add points to user ${userId}:`, error);
    throw error;
  }
}