import type { FirebaseOptions } from "firebase/app";

function getRequiredPublicEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }

  return value;
}

export function getFirebaseClientConfig(): FirebaseOptions {
  return {
    apiKey: getRequiredPublicEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
    authDomain: getRequiredPublicEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId: getRequiredPublicEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    appId: getRequiredPublicEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  };
}
