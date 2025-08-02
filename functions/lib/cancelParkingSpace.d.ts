import * as functions from 'firebase-functions';
/**
 * El proveedor anula una reserva ya aceptada.
 * 1. Verifica auth y que el proveedor sea el dueño.
 * 2. Cambia status -> "cancelada" y elimina takerId.
 * 3. Resta 1 PARKCOIN al proveedor y suma contador de cancelaciones.
 * 4. Envía push al buscador y al proveedor.
 */
export declare const cancelParkingSpace: functions.HttpsFunction & functions.Runnable<any>;
//# sourceMappingURL=cancelParkingSpace.d.ts.map