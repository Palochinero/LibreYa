import * as functions from 'firebase-functions';
/**
 * Verifica los límites de publicación según el plan del usuario.
 * 1. Free Plan: 1 plaza por día
 * 2. Premium Plan: Sin límites
 * 3. Con anuncios: +2 plazas por anuncio visto
 */
export declare const checkPublishLimits: functions.HttpsFunction & functions.Runnable<any>;
//# sourceMappingURL=checkPublishLimits.d.ts.map