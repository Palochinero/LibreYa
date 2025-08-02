"use strict";
// functions/src/reportUser.ts – Función para reportar usuarios
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportUser = void 0;
const functions = __importStar(require("firebase-functions"));
const firebaseAdmin_1 = require("./utils/firebaseAdmin");
const fn = functions.region('us-central1');
/**
 * Permite a un usuario reportar a otro por comportamiento inapropiado.
 * 1. Valida que el usuario reportado existe.
 * 2. Guarda el reporte en la colección 'reports'.
 * 3. Opcionalmente envía notificación a administradores.
 * 4. Previene reportes duplicados del mismo usuario.
 */
exports.reportUser = fn.https.onCall(async (data, context) => {
    /* ───── 1) Autenticación ───── */
    const reporterId = context.auth?.uid;
    if (!reporterId)
        throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión');
    const { reportedUserId, reason, details, evidence } = data;
    if (!reportedUserId || !reason) {
        throw new functions.https.HttpsError('invalid-argument', 'Faltan datos requeridos: reportedUserId y reason');
    }
    if (reporterId === reportedUserId) {
        throw new functions.https.HttpsError('invalid-argument', 'No puedes reportarte a ti mismo');
    }
    try {
        /* ───── 2) Verificar que el usuario reportado existe ───── */
        const reportedUserRef = firebaseAdmin_1.db.doc(`users/${reportedUserId}`);
        const reportedUserSnap = await reportedUserRef.get();
        if (!reportedUserSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'El usuario reportado no existe');
        }
        /* ───── 3) Verificar que no hay reporte duplicado reciente ───── */
        const oneDayAgo = firebaseAdmin_1.admin.firestore.Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
        const existingReportQuery = firebaseAdmin_1.db
            .collection('reports')
            .where('reporterId', '==', reporterId)
            .where('reportedUserId', '==', reportedUserId)
            .where('createdAt', '>=', oneDayAgo);
        const existingReports = await existingReportQuery.get();
        if (!existingReports.empty) {
            throw new functions.https.HttpsError('already-exists', 'Ya has reportado a este usuario en las últimas 24 horas');
        }
        /* ───── 4) Crear el reporte ───── */
        const reportData = {
            reporterId,
            reportedUserId,
            reason,
            details: details || '',
            evidence: evidence || '',
            status: 'pendiente', // pendiente, investigado, resuelto, rechazado
            createdAt: firebaseAdmin_1.admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebaseAdmin_1.admin.firestore.FieldValue.serverTimestamp(),
            adminNotes: '',
            resolvedAt: null,
            resolvedBy: null
        };
        const reportRef = await firebaseAdmin_1.db.collection('reports').add(reportData);
        /* ───── 5) Actualizar contador de reportes del usuario ───── */
        await reportedUserRef.update({
            reportCount: firebaseAdmin_1.admin.firestore.FieldValue.increment(1),
            lastReportedAt: firebaseAdmin_1.admin.firestore.FieldValue.serverTimestamp()
        });
        /* ───── 6) Notificar a administradores (simulado) ───── */
        try {
            // Aquí podrías enviar email a admins o notificación push
            functions.logger.info(`Nuevo reporte creado: ${reportRef.id}`, {
                reporterId,
                reportedUserId,
                reason
            });
            // Simular envío de email a administradores
            await sendAdminNotification(reportRef.id, reportedUserId, reason);
        }
        catch (error) {
            functions.logger.error('Error notificando a administradores:', error);
            // No fallar la función si la notificación falla
        }
        return {
            success: true,
            reportId: reportRef.id,
            message: 'Reporte enviado correctamente. Los administradores lo revisarán.'
        };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        functions.logger.error('Error creando reporte:', error);
        throw new functions.https.HttpsError('internal', 'Error interno del servidor');
    }
});
/**
 * Función auxiliar para enviar notificación a administradores
 */
async function sendAdminNotification(reportId, reportedUserId, reason) {
    // Simulación de envío de email/notificación a admins
    // En producción, aquí usarías SendGrid, Mailgun, o similar
    const adminNotification = {
        type: 'user_report',
        reportId,
        reportedUserId,
        reason,
        timestamp: new Date().toISOString(),
        priority: 'medium'
    };
    // Guardar en colección de notificaciones para admins
    await firebaseAdmin_1.db.collection('adminNotifications').add({
        ...adminNotification,
        createdAt: firebaseAdmin_1.admin.firestore.FieldValue.serverTimestamp(),
        read: false
    });
    functions.logger.info('Notificación de reporte enviada a administradores', adminNotification);
}
//# sourceMappingURL=reportUser.js.map