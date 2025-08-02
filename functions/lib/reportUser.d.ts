import * as functions from 'firebase-functions';
/**
 * Permite a los usuarios reportar a otros usuarios por diferentes motivos.
 * 1. Reportes normales: entre usuarios conocidos
 * 2. Reportes anónimos: para reportar gorristas/scammers
 * 3. Sistema de recompensas: 2 PARKCOINS por reporte válido
 * 4. Alertas automáticas: cuando hay 10 reportes en una zona
 */
export declare const reportUser: functions.HttpsFunction & functions.Runnable<any>;
//# sourceMappingURL=reportUser.d.ts.map