import { browser } from '$app/environment';
import { initializeApp } from 'firebase/app';
import { browserLocalPersistence, initializeAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};
export const firebaseConfigured = Boolean(browser && config.apiKey && config.authDomain && config.projectId && config.appId);
let app = null;
let auth = null;
let db = null;
let functions = null;
if (firebaseConfigured) {
    app = initializeApp(config);
    auth = initializeAuth(app, { persistence: browserLocalPersistence });
    db = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
    functions = getFunctions(app, import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'asia-south1');
}
export { auth, db };
export function requireFirebase() {
    if (!app || !auth || !db || !functions) {
        throw new Error('firebase/not-configured');
    }
    return { app, auth, db, functions };
}
