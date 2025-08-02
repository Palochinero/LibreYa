import * as functions from 'firebase-functions';
/**
 * El conductor marca que ya ocupó la plaza.
 * 1. Verifica auth y que el conductor sea el taker.
 * 2. Cambia status -> "completada".
 * 3. Suma 1 PARKCOIN al proveedor.
 * 4. Envía push al proveedor y al conductor.
 */
export declare const completeParkingSpace: functions.HttpsFunction & functions.Runnable<any>;
//# sourceMappingURL=completeParkingSpace.d.ts.map