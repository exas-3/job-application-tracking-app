import "server-only";
import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getFirebaseAdminEnv } from "@/lib/firebase/adminEnv";

function getFirebaseAdminApp() {
  if (getApps().length) {
    return getApp();
  }

  const env = getFirebaseAdminEnv();
  return initializeApp({
    credential: cert({
      projectId: env.projectId,
      clientEmail: env.clientEmail,
      privateKey: env.privateKey,
    }),
    projectId: env.projectId,
  });
}

export const firebaseAdminApp = getFirebaseAdminApp();
export const firebaseAdminAuth = getAuth(firebaseAdminApp);
export const firebaseAdminDb = getFirestore(firebaseAdminApp);
