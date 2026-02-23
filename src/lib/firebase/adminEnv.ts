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

function normalizePrivateKey(value: string): string {
  const withNewlines = value.replace(/\\n/g, "\n").trim();
  const match = withNewlines.match(
    /-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/m,
  );

  if (!match) return withNewlines;

  const body = (match[1] ?? "").replace(/[^A-Za-z0-9+/=]/g, "");
  if (!body) return withNewlines;

  const wrappedBody = body.match(/.{1,64}/g)?.join("\n") ?? body;
  return `-----BEGIN PRIVATE KEY-----\n${wrappedBody}\n-----END PRIVATE KEY-----\n`;
}

export function getFirebaseAdminEnv(): FirebaseAdminEnv {
  return {
    projectId: getRequiredServerEnv("FIREBASE_PROJECT_ID"),
    clientEmail: getRequiredServerEnv("FIREBASE_CLIENT_EMAIL"),
    privateKey: normalizePrivateKey(getRequiredServerEnv("FIREBASE_PRIVATE_KEY")),
  };
}
