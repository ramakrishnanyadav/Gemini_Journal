import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken, AppCheck } from 'firebase/app-check';
const defaultConfig = {
  projectId: 'gen-lang-client-0011052197',
  appId: '1:125624824526:web:fe587d534df1bcf908969f',
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || 'AIzaSyAlDAPrJ2ijzkGCDWa_F-hqD4BFCE02C0o',
  authDomain: 'gen-lang-client-0011052197.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-personalgeminijo-e0167b3a-3188-48d6-8f0e-ffb3db56798d',
  storageBucket: 'gen-lang-client-0011052197.firebasestorage.app',
  messagingSenderId: '125624824526',
};

const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || defaultConfig.apiKey,
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || defaultConfig.authDomain,
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || defaultConfig.projectId,
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || defaultConfig.storageBucket,
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultConfig.messagingSenderId,
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || defaultConfig.appId,
};

// Initialize Firebase client app singleton
export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = defaultConfig.firestoreDatabaseId && defaultConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(firebaseApp, defaultConfig.firestoreDatabaseId)
  : getFirestore(firebaseApp);

export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
githubProvider.addScope('read:user');
githubProvider.addScope('user:email');

// App Check Singleton Initialization
let appCheckInstance: AppCheck | null = null;
const appCheckSiteKey = (import.meta as any).env?.VITE_FIREBASE_APPCHECK_SITE_KEY;

if (typeof window !== 'undefined' && appCheckSiteKey) {
  try {
    appCheckInstance = initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    console.warn('[Firebase App Check] Client initialization deferred or unavailable:', err);
  }
}

/**
 * Retrieve current Firebase App Check token to send in the X-Firebase-AppCheck header.
 */
export async function getAppCheckToken(): Promise<string | null> {
  if (!appCheckInstance) return null;
  try {
    const result = await getToken(appCheckInstance, /* forceRefresh */ false);
    return result.token;
  } catch (err) {
    console.warn('[Firebase App Check] Failed to fetch token:', err);
    return null;
  }
}

