import * as functions from 'firebase-functions';
/**
 * Permite a un usuario reportar a otro por comportamiento inapropiado.
 * 1. Valida que el usuario reportado existe.
 * 2. Guarda el reporte en la colección 'reports'.
 * 3. Opcionalmente envía notificación a administradores.
 * 4. Previene reportes duplicados del mismo usuario.
 */
export declare const reportUser: functions.HttpsFunction & functions.Runnable<any>;
//# sourceMappingURL=reportUser.d.ts.map