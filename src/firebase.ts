import { initializeApp } from 'firebase/app';
import { 
  getAuth,
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithCredential,
  signOut 
} from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  memoryLocalCache,
  doc, 
  setDoc 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Industry Gold Standard (Option B / Option 3): Dynamically configure authDomain to match 
// the current browser's origin. This ensures the authentication helper popup/iframe 
// is loaded from the same origin as the application, completely eliminating third-party 
// cookie restrictions even inside embedded iframes. All requests to /__/auth/* are 
// proxied by our custom Express backend server to Firebase.
const app = initializeApp(firebaseConfig);

// Industry Gold Standard: Try to initialize with robust multi-tab persistent local cache
// Fallback to memory-only local cache if IndexedDB/persistence is locked, corrupted, or unsupported (e.g. inside an iframe, private window)
export let db: any;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    }),
    experimentalForceLongPolling: true,
  }, firebaseConfig.firestoreDatabaseId);
  console.log("Firestore initialized successfully with multi-tab persistence and long-polling.");
} catch (error) {
  console.warn("Firestore persistentLocalCache initialization failed, falling back to memoryLocalCache:", error);
  try {
    db = initializeFirestore(app, {
      localCache: memoryLocalCache(),
      experimentalForceLongPolling: true,
    }, firebaseConfig.firestoreDatabaseId);
  } catch (fallbackError) {
    console.error("Firestore critical initialization fallback failed:", fallbackError);
    // Last-resort fallback to standard initialization
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    }, firebaseConfig.firestoreDatabaseId);
  }
}

export async function enablePersistence() {
  // Persistence is handled at initialization
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Standard Google OAuth Authentication using Firebase Popup.
export async function signInWithGoogle(): Promise<any> {
  return signInWithPopup(auth, googleProvider);
}

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
