import * as functions from 'firebase-functions';
/**
 * Trigger que se ejecuta cada vez que se crea o edita un parkingSpace.
 * Genera automáticamente un campo geoHash basado en lat/lng para búsquedas eficientes.
 *
 * El geoHash se calcula con precisión 9 (aproximadamente 5m x 5m) para búsquedas
 * precisas pero no demasiado granulares.
 */
export declare const geoIndexParkingSpace: functions.CloudFunction<functions.Change<functions.firestore.DocumentSnapshot>>;
//# sourceMappingURL=geoIndexParkingSpace.d.ts.map