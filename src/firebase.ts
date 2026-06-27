import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
// CRITICAL: The app will break without passing firestoreDatabaseId in the second parameter
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({})
}, firebaseConfig.firestoreDatabaseId);

export async function enablePersistence() {
  // Persistence is now enabled at initialization
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export async function logAuditEvent(
  action: string,
  targetId: string,
  targetType: 'order' | 'product' | 'role' | 'quote' | 'user' | 'system',
  details: string
) {
  const user = auth.currentUser;
  if (!user) {
    console.warn("Audit logger skipped: No authenticated user session active.");
    return;
  }
  try {
    const id = `log-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const logRef = doc(db, 'audit_logs', id);
    const logData = {
      id,
      actorUid: user.uid,
      actorEmail: user.email || 'unidentified-staff@skyit.com',
      action,
      details: details.substring(0, 3950), // within Firestore limits
      targetId,
      targetType,
      timestamp: new Date().toISOString()
    };
    await setDoc(logRef, logData);
  } catch (err) {
    console.warn("Audit logging commitment exception ignored:", err);
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
