import * as functions from 'firebase-functions';
/**
 * Tarea programada que expira plazas pendientes cuyo tiempo ya pasó.
 * Se ejecuta cada 5 minutos y busca plazas con scheduledTime vencida.
 * Cambia su status a 'expirada' para mantener historial.
 */
export declare const autoExpireParkingSpace: functions.CloudFunction<unknown>;
//# sourceMappingURL=autoExpireParkingSpace.d.ts.map