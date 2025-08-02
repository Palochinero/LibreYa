import * as functions from 'firebase-functions';
/**
 * Permite al conductor cancelar una plaza con penalización.
 * 1. Verifica que el conductor sea el taker.
 * 2. Resta 1 PARKCOIN al conductor.
 * 3. Notifica al proveedor para que pueda reportar si es necesario.
 * 4. Actualiza el estado de la plaza.
 */
export declare const cancelWithPenalty: functions.HttpsFunction & functions.Runnable<any>;
//# sourceMappingURL=cancelWithPenalty.d.ts.map