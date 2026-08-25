import { browser } from '$app/environment';
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { browserLocalPersistence, initializeAuth, type Auth } from 'firebase/auth';
import {
	initializeFirestore,
	persistentLocalCache,
	persistentMultipleTabManager,
	type Firestore
} from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';

const config = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
	appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const firebaseConfigured = Boolean(
	browser && config.apiKey && config.authDomain && config.projectId && config.appId
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let functions: Functions | null = null;

if (firebaseConfigured) {
	app = initializeApp(config);
	auth = initializeAuth(app, { persistence: browserLocalPersistence });
	db = initializeFirestore(app, {
		localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
	});
	functions = getFunctions(app, import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'asia-south1');
}

export { app, auth, db, functions };

export function requireFirebase(): {
	app: FirebaseApp;
	auth: Auth;
	db: Firestore;
	functions: Functions;
} {
	if (!app || !auth || !db || !functions) {
		throw new Error('firebase/not-configured');
	}
	return { app, auth, db, functions };
}
