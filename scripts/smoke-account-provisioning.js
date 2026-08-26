import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { deleteApp, initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, EmailAuthProvider, getAuth, reauthenticateWithCredential, signInWithEmailAndPassword, signOut, updatePassword } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
const requireFromFunctions = createRequire(new URL('../functions/package.json', import.meta.url));
const { applicationDefault, deleteApp: deleteAdminApp, initializeApp: initializeAdminApp } = requireFromFunctions('firebase-admin/app');
const { getAuth: getAdminAuth } = requireFromFunctions('firebase-admin/auth');
const { getFirestore } = requireFromFunctions('firebase-admin/firestore');
function loadEnvironment() {
    return Object.fromEntries(readFileSync('.env', 'utf8')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
        .map((line) => {
        const separator = line.indexOf('=');
        return [
            line.slice(0, separator),
            line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '')
        ];
    }));
}
const env = loadEnvironment();
const projectId = env.VITE_FIREBASE_PROJECT_ID;
if (!projectId)
    throw new Error('Missing VITE_FIREBASE_PROJECT_ID in .env.');
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS is required so temporary smoke-test accounts can be removed.');
}
const app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    appId: env.VITE_FIREBASE_APP_ID
});
const auth = getAuth(app);
const functions = getFunctions(app, 'asia-south1');
const adminApp = initializeAdminApp({ credential: applicationDefault(), projectId }, 'account-smoke');
const adminAuth = getAdminAuth(adminApp);
const db = getFirestore(adminApp);
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const travellerEmail = `account-smoke-${suffix}@example.com`;
const travellerPassword = `Vazhi-${suffix}-aA7!`;
let travellerUid;
let dutyId;
async function userExists(email) {
    try {
        await adminAuth.getUserByEmail(email);
        return true;
    }
    catch (error) {
        if (error.code === 'auth/user-not-found')
            return false;
        throw error;
    }
}
async function availableDutyId() {
    for (let number = 999; number >= 900; number--) {
        const candidate = `DRV-${number}`;
        const [record, accountExists] = await Promise.all([
            db.collection('crew').doc(candidate).get(),
            userExists(`${candidate.toLowerCase()}@crew.vazhi.app`)
        ]);
        if (!record.exists && !accountExists)
            return candidate;
    }
    throw new Error('No unused DRV-900 through DRV-999 duty ID is available for the smoke test.');
}
async function main() {
    const traveller = await createUserWithEmailAndPassword(auth, travellerEmail, travellerPassword);
    travellerUid = traveller.user.uid;
    await httpsCallable(functions, 'registerTraveller')({
        displayName: 'Account Smoke Traveller'
    });
    const travellerToken = await traveller.user.getIdTokenResult(true);
    if (travellerToken.claims.role !== 'traveller') {
        throw new Error('New traveller did not receive the traveller role claim.');
    }
    await signOut(auth);
    await signInWithEmailAndPassword(auth, 'ops-01@operations.vazhi.app', 'demo123');
    dutyId = await availableDutyId();
    const created = await httpsCallable(functions, 'createCrewWithAccount')({
        member: {
            id: dutyId,
            role: 'driver',
            name: 'Account Smoke Driver',
            depot: 'Salem',
            status: 'available'
        },
        initialPassword: travellerPassword
    });
    await signOut(auth);
    const credentials = created.data.credentials;
    await signInWithEmailAndPassword(auth, `${credentials.identifier.toLowerCase()}@crew.vazhi.app`, travellerPassword);
    const crewToken = await auth.currentUser?.getIdTokenResult(true);
    if (crewToken?.claims.role !== 'driver' || crewToken.claims.dutyId !== dutyId) {
        throw new Error('Provisioned driver has incorrect role claims.');
    }
    await httpsCallable(functions, 'verifyDutyIdentity')({
        badgeId: credentials.badgeId
    });
    if (!auth.currentUser?.email)
        throw new Error('Provisioned driver has no Firebase email.');
    await reauthenticateWithCredential(auth.currentUser, EmailAuthProvider.credential(auth.currentUser.email, travellerPassword));
    const changedPassword = `${travellerPassword}-changed`;
    await updatePassword(auth.currentUser, changedPassword);
    await signOut(auth);
    await signInWithEmailAndPassword(auth, `${credentials.identifier.toLowerCase()}@crew.vazhi.app`, changedPassword);
    console.log('Account provisioning smoke tests passed: traveller registration, Operations password, crew login, crew password change.');
}
try {
    await main();
}
finally {
    if (auth.currentUser)
        await signOut(auth).catch(() => undefined);
    if (travellerUid)
        await adminAuth.deleteUser(travellerUid).catch(() => undefined);
    if (dutyId) {
        const crewAccount = await adminAuth
            .getUserByEmail(`${dutyId.toLowerCase()}@crew.vazhi.app`)
            .catch(() => undefined);
        if (crewAccount)
            await adminAuth.deleteUser(crewAccount.uid).catch(() => undefined);
        await db.collection('crew').doc(dutyId).delete().catch(() => undefined);
    }
    await deleteApp(app);
    await deleteAdminApp(adminApp);
}
