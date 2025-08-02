// functions/src/penalizeAbusers.ts – Función para penalizar usuarios abusivos

import * as functions from 'firebase-functions';
import { admin, db } from './utils/firebaseAdmin';

const fn = functions.region('us-central1');

/**
 * Tarea programada diaria que penaliza usuarios que cancelan demasiado.
 * Se ejecuta cada día a las 2:00 AM y revisa usuarios con más de 3 cancelaciones
 * en las últimas 24 horas. Reduce su reputación o los suspende.
 */
export const penalizeAbusers = fn.pubsub
  .schedule('0 2 * * *') // Cada día a las 2:00 AM
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const yesterday = new Date(now.toDate().getTime() - 24 * 60 * 60 * 1000);
    const yesterdayTimestamp = admin.firestore.Timestamp.fromDate(yesterday);
    
    let penalizedCount = 0;
    let suspendedCount = 0;

    try {
      // Buscar usuarios con más de 3 cancelaciones en las últimas 24h
      const usersQuery = db.collection('users');
      const usersSnapshot = await usersQuery.get();

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;

        // Contar cancelaciones en las últimas 24h
        const cancellationsQuery = db
          .collection('parkingSpaces')
          .where('providerId', '==', userId)
          .where('status', '==', 'cancelada')
          .where('updatedAt', '>=', yesterdayTimestamp);

        const cancellationsSnapshot = await cancellationsQuery.get();
        const recentCancellations = cancellationsSnapshot.size;

        if (recentCancellations >= 3) {
          const userRef = db.doc(`users/${userId}`);
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
          } else {
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

    } catch (error) {
      functions.logger.error('Error en proceso de penalización:', error);
      throw error;
    }
  }); 