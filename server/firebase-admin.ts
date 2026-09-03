import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getAppCheck } from 'firebase-admin/app-check';
import fs from 'fs';
import path from 'path';

let app: App;

let projectId = process.env.FIREBASE_PROJECT_ID;
let firestoreDbId: string | undefined;

try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (config.projectId) {
      projectId = config.projectId;
    }
    if (config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)') {
      firestoreDbId = config.firestoreDatabaseId;
    }
  }
} catch (e) {
  console.warn('[Firebase Admin] Warning reading firebase-applet-config.json:', e);
}

if (getApps().length === 0) {
  app = initializeApp({
    projectId: projectId || undefined,
  });
} else {
  app = getApp();
}

export const adminAuth = getAuth(app);
export const firestore = firestoreDbId ? getFirestore(app, firestoreDbId) : getFirestore(app);
export const adminAppCheck = getAppCheck(app);
