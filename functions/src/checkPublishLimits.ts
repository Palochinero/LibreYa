// functions/src/checkPublishLimits.ts – Función para verificar límites de publicación

import * as functions from 'firebase-functions';
import { admin, db } from './utils/firebaseAdmin';

const fn = functions.region('us-central1');

interface CheckLimitsPayload {
  userId: string;
}

/**
 * Verifica los límites de publicación según el plan del usuario.
 * 1. Free Plan: 1 plaza por día
 * 2. Premium Plan: Sin límites
 * 3. Con anuncios: +2 plazas por anuncio visto
 */
export const checkPublishLimits = fn.https.onCall(async (data: CheckLimitsPayload, context) => {
  /* ───── 1) Autenticación ───── */
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión');
  
  const { userId } = data;
  if (!userId) {
    throw new functions.https.HttpsError('invalid-argument', 'Falta "userId"');
  }

  try {
    /* ───── 2) Obtener información del usuario ───── */
    const userRef = db.doc(`users/${userId}`);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Usuario no encontrado');
    }

    const userData = userSnap.data();
    if (!userData) {
      throw new functions.https.HttpsError('not-found', 'Datos de usuario no encontrados');
    }

    /* ───── 3) Verificar plan y límites ───── */
    const userPlan = userData.plan || 'free';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Contar publicaciones de hoy
    const todayPublicationsQuery = await db.collection('parkingSpaces')
      .where('providerId', '==', userId)
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(today))
      .get();

    const todayPublications = todayPublicationsQuery.size;
    
    // Límites según el plan
    let dailyLimit = 1; // Free plan por defecto
    let canPublish = false;
    let reason = '';
    let upgradeMessage = '';

    switch (userPlan) {
      case 'free':
        dailyLimit = 1;
        canPublish = todayPublications < dailyLimit;
        if (!canPublish) {
          reason = 'Límite diario alcanzado';
          upgradeMessage = 'Actualiza a Premium por €5/mes para publicar sin límites y recibir 10 PARKCOINS';
        }
        break;
        
      case 'premium':
        dailyLimit = -1; // Sin límites
        canPublish = true;
        break;
        
      case 'ad_supported':
        // Free + anuncios vistos
        const adsWatched = userData.adsWatchedToday || 0;
        dailyLimit = 1 + (adsWatched * 2); // +2 por anuncio
        canPublish = todayPublications < dailyLimit;
        if (!canPublish) {
          reason = 'Límite diario alcanzado';
          upgradeMessage = 'Ve más anuncios o actualiza a Premium para publicar más';
        }
        break;
        
      default:
        dailyLimit = 1;
        canPublish = todayPublications < dailyLimit;
        if (!canPublish) {
          reason = 'Límite diario alcanzado';
          upgradeMessage = 'Actualiza a Premium por €5/mes para publicar sin límites';
        }
    }

    /* ───── 4) Información adicional para anuncios ───── */
    let adInfo = null;
    if (userPlan === 'ad_supported' && !canPublish) {
      const adsNeeded = Math.ceil((todayPublications - dailyLimit + 1) / 2);
      adInfo = {
        adsWatchedToday: userData.adsWatchedToday || 0,
        adsNeeded,
        adsRemaining: Math.max(0, 5 - (userData.adsWatchedToday || 0)) // Máximo 5 anuncios por día
      };
    }

    return {
      success: true,
      canPublish,
      userPlan,
      todayPublications,
      dailyLimit,
      reason,
      upgradeMessage,
      adInfo,
      premiumPrice: 5,
      premiumParkcoins: 10
    };

  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    functions.logger.error('Error verificando límites de publicación:', error);
    throw new functions.https.HttpsError('internal', 'Error interno del servidor');
  }
}); 