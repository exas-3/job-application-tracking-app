import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFirebaseClientConfig } from "@/lib/firebase/clientEnv";

function getFirebaseClientApp() {
  if (getApps().length) {
    return getApp();
  }

  return initializeApp(getFirebaseClientConfig());
}

export const firebaseClientApp = getFirebaseClientApp();
export const firebaseAuth = getAuth(firebaseClientApp);
export const firebaseDb = getFirestore(firebaseClientApp);
