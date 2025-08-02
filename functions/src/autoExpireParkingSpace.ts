// functions/src/autoExpireParkingSpace.ts – Función para expirar plazas automáticamente

import * as functions from 'firebase-functions';
import { admin, db } from './utils/firebaseAdmin';

const fn = functions.region('us-central1');

/**
 * Tarea programada que expira plazas pendientes cuyo tiempo ya pasó.
 * Se ejecuta cada 5 minutos y busca plazas con scheduledTime vencida.
 * Cambia su status a 'expirada' para mantener historial.
 */
export const autoExpireParkingSpace = fn.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const batch = db.batch();
    let expiredCount = 0;

    try {
      // Buscar plazas pendientes cuya scheduledTime ya pasó
      const expiredSpacesQuery = db
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

    } catch (error) {
      functions.logger.error('Error expirando plazas automáticamente:', error);
      throw error;
    }
  }); 