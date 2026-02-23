import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFirebaseClientConfig } from "@/lib/firebase/clientEnv";

let appCache: FirebaseApp | null = null;

export function getFirebaseClientApp() {
  if (appCache) return appCache;

  if (getApps().length) {
    appCache = getApp();
    return appCache;
  }

  appCache = initializeApp(getFirebaseClientConfig());
  return appCache;
}

export function getFirebaseAuthInstance() {
  return getAuth(getFirebaseClientApp());
}

export function getFirebaseDbInstance() {
  return getFirestore(getFirebaseClientApp());
}
