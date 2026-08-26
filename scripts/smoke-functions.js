import { readFileSync } from 'node:fs';
import { deleteApp, initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, getDocs, getFirestore } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { demoAccounts } from '../src/lib/mocks/accounts.mock';
function loadEnvironment() {
    return Object.fromEntries(readFileSync('.env', 'utf8')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
        .map((line) => {
        const separator = line.indexOf('=');
        const key = line.slice(0, separator);
        const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
        return [key, value];
    }));
}
function firebaseEmail(account) {
    const value = account.identifier.trim().toLocaleLowerCase('en');
    if (value.includes('@'))
        return value;
    if (account.role === 'traveller' && /^\+?\d{10,15}$/.test(value)) {
        return `${value.replace(/^\+/, '')}@phone.vazhi.app`;
    }
    const scope = account.role === 'operations' ? 'operations' : 'crew';
    return `${value.replace(/[^a-z0-9-]/g, '')}@${scope}.vazhi.app`;
}
const env = loadEnvironment();
const required = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_APP_ID'
];
for (const key of required) {
    if (!env[key])
        throw new Error(`Missing ${key} in .env.`);
}
const app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    appId: env.VITE_FIREBASE_APP_ID
});
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'asia-south1');
const requestedRouteIds = [
    'coimbatore-chennai',
    'madurai-chennai',
    'bangalore-chennai',
    'trichy-chennai',
    'salem-bangalore'
];
async function authenticate(account) {
    await signInWithEmailAndPassword(auth, firebaseEmail(account), account.password);
    const token = await auth.currentUser?.getIdTokenResult(true);
    if (token?.claims.role !== account.role) {
        throw new Error(`${account.role} account has an incorrect role claim.`);
    }
}
async function signOutAndVerify() {
    await signOut(auth);
    if (auth.currentUser !== null)
        throw new Error('Firebase Auth still has a current user after sign-out.');
}
async function main() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    const serviceDate = local.toISOString().slice(0, 10);
    const search = await httpsCallable(functions, 'searchTrips')({ serviceDate });
    if (!search.data.trips.length)
        throw new Error('Public search returned no seeded trips.');
    for (const routeId of requestedRouteIds) {
        const count = search.data.trips.filter((trip) => trip.routeId === routeId).length;
        if (count < 2)
            throw new Error(`${routeId} returned only ${count} seeded trips.`);
    }
    const results = [`public-search(${search.data.trips.length})`];
    for (const account of demoAccounts) {
        await authenticate(account);
        if (account.role === 'traveller') {
            await httpsCallable(functions, 'getSeatAvailability')({ tripId: search.data.trips[0].id });
        }
        else if (account.role === 'driver' || account.role === 'conductor') {
            if (!account.driverId)
                throw new Error(`${account.role} demo badge is missing.`);
            await httpsCallable(functions, 'verifyDutyIdentity')({
                badgeId: account.driverId
            });
            await httpsCallable(functions, 'getAssignedTrip')({});
        }
        else {
            const [tripDocs, busDocs] = await Promise.all([
                getDocs(collection(db, 'trips')),
                getDocs(collection(db, 'buses'))
            ]);
            const busIds = new Set(busDocs.docs.map((entry) => entry.id));
            for (const routeId of requestedRouteIds) {
                const routeTrips = tripDocs.docs.filter((entry) => entry.data().routeId === routeId);
                if (routeTrips.length < 2)
                    throw new Error(`Operations cannot see ${routeId}.`);
                if (routeTrips.some((entry) => !busIds.has(String(entry.data().busId)))) {
                    throw new Error(`${routeId} has a trip without a visible Operations bus.`);
                }
            }
            await httpsCallable(functions, 'validateTripAssignment')({
                trip: {
                    serviceDate,
                    busId: 'SMOKE-BUS',
                    driverId: 'SMOKE-DRIVER',
                    conductorId: 'SMOKE-CONDUCTOR',
                    departureTime: '00:00',
                    arrivalTime: '00:01'
                }
            });
        }
        results.push(account.role);
        await signOutAndVerify();
    }
    console.log(`Firebase smoke tests passed: ${results.join(', ')}.`);
}
try {
    await main();
}
finally {
    if (auth.currentUser)
        await signOutAndVerify();
    await deleteApp(app);
}
