import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { parseServiceAccountJson } from './service-account-parser';

let adminApp: App | null = null;
let adminDb: Firestore | null = null;

function getAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  // Check if already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  try {
    const serviceAccount = parseServiceAccountJson(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    
    // Use Firebase project ID explicitly, not the service account's project_id
    // The service account might be from a different GCP project
    const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    
    if (!firebaseProjectId) {
      throw new Error(
        'Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable. This should match your Firebase project ID.'
      );
    }
    
    adminApp = initializeApp({
      credential: cert(serviceAccount),
      projectId: firebaseProjectId, // Use Firebase project ID, not service account project_id
    });

    console.log(`✅ Firebase Admin initialized for Firebase project: ${firebaseProjectId}`);
    console.log(`   Service account project: ${serviceAccount.project_id || 'N/A'}`);
    return adminApp;
  } catch (error) {
    throw new Error(
      `Failed to initialize Firebase Admin: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export function getAdminFirestore(): Firestore {
  if (adminDb) {
    return adminDb;
  }

  const app = getAdminApp();
  adminDb = getFirestore(app);
  return adminDb;
}

