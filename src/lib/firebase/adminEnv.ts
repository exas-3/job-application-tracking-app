type FirebaseAdminEnv = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

function getRequiredServerEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }

  return value;
}

export function getFirebaseAdminEnv(): FirebaseAdminEnv {
  return {
    projectId: getRequiredServerEnv("FIREBASE_PROJECT_ID"),
    clientEmail: getRequiredServerEnv("FIREBASE_CLIENT_EMAIL"),
    privateKey: getRequiredServerEnv("FIREBASE_PRIVATE_KEY").replace(
      /\\n/g,
      "\n",
    ),
  };
}
