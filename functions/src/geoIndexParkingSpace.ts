// functions/src/geoIndexParkingSpace.ts – Trigger para generar índices geográficos

import * as functions from 'firebase-functions';
import * as geohash from 'ngeohash';
import { admin, db } from './utils/firebaseAdmin';

const fn = functions.region('us-central1');

/**
 * Trigger que se ejecuta cada vez que se crea o edita un parkingSpace.
 * Genera automáticamente un campo geoHash basado en lat/lng para búsquedas eficientes.
 * 
 * El geoHash se calcula con precisión 9 (aproximadamente 5m x 5m) para búsquedas
 * precisas pero no demasiado granulares.
 */
export const geoIndexParkingSpace = fn.firestore
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

    const { latitude, longitude } = newData as any;
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
        lastGeoIndexUpdate: admin.firestore.FieldValue.serverTimestamp()
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

    } catch (error) {
      functions.logger.error(`Error actualizando geoHash para ${spaceId}:`, error);
      throw error;
    }
  }); 