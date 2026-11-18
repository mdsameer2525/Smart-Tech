import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

export interface VerifiedGoogleProfile {
  uid: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string | null;
}

type TokenVerifier = (idToken: string) => Promise<VerifiedGoogleProfile>;

let customTestVerifier: TokenVerifier | null = null;

function resolveFirebaseProjectId(): string | null {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PROJECT_ID.trim()) {
    return process.env.FIREBASE_PROJECT_ID.trim();
  }

  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as { projectId?: string };
      if (parsed.projectId && parsed.projectId !== 'remixed-project-id') {
        return parsed.projectId;
      }
    } catch {
      return null;
    }
  }

  return null;
}

function getAdminAuth() {
  const projectId = resolveFirebaseProjectId();
  if (!projectId) {
    throw new Error('Firebase project configuration is missing.');
  }

  const app = getApps().length ? getApp() : initializeApp({ projectId });
  return getAuth(app);
}

export async function verifyFirebaseGoogleToken(idToken: string): Promise<VerifiedGoogleProfile> {
  if (customTestVerifier) {
    return customTestVerifier(idToken);
  }

  const decoded = await getAdminAuth().verifyIdToken(idToken);
  if (!decoded.uid || !decoded.email) {
    throw new Error('Google account email is missing from token.');
  }

  return {
    uid: decoded.uid,
    email: decoded.email.trim().toLowerCase(),
    emailVerified: Boolean(decoded.email_verified),
    name:
      (typeof decoded.name === 'string' && decoded.name.trim()) ||
      decoded.email.split('@')[0] ||
      'Smart-Tech Learner',
    picture: typeof decoded.picture === 'string' && decoded.picture.trim() ? decoded.picture : null,
  };
}

export function setFirebaseTokenVerifierForTesting(verifier: TokenVerifier | null): void {
  customTestVerifier = verifier;
}
