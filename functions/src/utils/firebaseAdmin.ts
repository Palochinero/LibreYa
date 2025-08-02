// utils/firebaseAdmin.ts  ➜ instancia única y compartida
import * as admin from 'firebase-admin';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
export { admin, db };
