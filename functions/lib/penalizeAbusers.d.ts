import * as functions from 'firebase-functions';
/**
 * Tarea programada diaria que penaliza usuarios que cancelan demasiado.
 * Se ejecuta cada día a las 2:00 AM y revisa usuarios con más de 3 cancelaciones
 * en las últimas 24 horas. Reduce su reputación o los suspende.
 */
export declare const penalizeAbusers: functions.CloudFunction<unknown>;
//# sourceMappingURL=penalizeAbusers.d.ts.map