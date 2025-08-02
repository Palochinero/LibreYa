import * as functions from 'firebase-functions';
/**
 * El conductor actualiza su ubicación en tiempo real mientras va hacia la plaza.
 * Solo funciona para plazas instantáneas (no programadas).
 * 1. Verifica que la plaza sea instantánea y esté reservada.
 * 2. Actualiza la ubicación del conductor.
 * 3. Calcula tiempo estimado de llegada.
 * 4. Notifica al proveedor si es necesario.
 */
export declare const trackParkingSpace: functions.HttpsFunction & functions.Runnable<any>;
//# sourceMappingURL=trackParkingSpace.d.ts.map