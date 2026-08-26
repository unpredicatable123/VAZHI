import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { districtFixtures, stopFixtures } from '../src/lib/mocks/stops.mock';
import { routeFixtures } from '../src/lib/mocks/routes.mock';
import { busFleetFixtures } from '../src/lib/mocks/fleet.mock';
import { crewFixtures } from '../src/lib/mocks/crew.mock';
import { tripFixtures } from '../src/lib/mocks/trips.mock';
import { demoAccounts } from '../src/lib/mocks/accounts.mock';
import { canonicalManifest } from '../src/lib/mocks/manifest.mock';
import { canonicalBooking } from '../src/lib/mocks/bookings.mock';
const requireFromFunctions = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp, applicationDefault } = requireFromFunctions('firebase-admin/app');
const { getFirestore, FieldValue } = requireFromFunctions('firebase-admin/firestore');
const { getAuth } = requireFromFunctions('firebase-admin/auth');
function projectFromArguments() {
    const equalsArgument = process.argv.find((argument) => argument.startsWith('--project='));
    if (equalsArgument)
        return equalsArgument.slice('--project='.length);
    const projectIndex = process.argv.indexOf('--project');
    return projectIndex >= 0 ? process.argv[projectIndex + 1] : undefined;
}
function projectFromFirebaseConfig() {
    if (!process.env.FIREBASE_CONFIG?.startsWith('{'))
        return undefined;
    try {
        const config = JSON.parse(process.env.FIREBASE_CONFIG);
        return config.projectId ?? config.project_id;
    }
    catch {
        throw new Error('FIREBASE_CONFIG is present but is not valid JSON.');
    }
}
async function resolveProjectId() {
    const configuredProject = projectFromArguments() ??
        process.env.GOOGLE_CLOUD_PROJECT ??
        process.env.GCLOUD_PROJECT ??
        projectFromFirebaseConfig();
    if (configuredProject)
        return configuredProject;
    try {
        const firebaseRc = JSON.parse(await readFile(new URL('../.firebaserc', import.meta.url), 'utf8'));
        const defaultProject = firebaseRc.projects?.default;
        if (defaultProject && defaultProject !== 'your-firebase-project-id')
            return defaultProject;
    }
    catch (error) {
        if (!(error instanceof SyntaxError) && error.code === 'ENOENT') {
            // A missing .firebaserc is handled by the actionable error below.
        }
        else {
            throw new Error('Unable to read the Firebase project from .firebaserc.', { cause: error });
        }
    }
    throw new Error('Firebase project ID is missing. Set projects.default in .firebaserc or run npm run firebase:seed -- --project=YOUR_PROJECT_ID.');
}
const projectId = await resolveProjectId();
const credential = applicationDefault();
try {
    await credential.getAccessToken();
}
catch (error) {
    throw new Error('Firebase Admin credentials are missing. Set GOOGLE_APPLICATION_CREDENTIALS to a Firebase service-account JSON file stored outside this repository, then run the seed again.', { cause: error });
}
initializeApp({ credential, projectId });
console.log(`Seeding Firebase project ${projectId}.`);
const db = getFirestore();
function authEmail(identifier, role) {
    const value = identifier.toLowerCase();
    if (value.includes('@'))
        return value;
    return `${value}@${role === 'operations' ? 'operations' : 'crew'}.vazhi.app`;
}
async function seedCollection(name, records) {
    let batch = db.batch();
    let count = 0;
    for (const record of records) {
        batch.set(db.collection(name).doc(record.id), record, { merge: true });
        count++;
        if (count % 400 === 0) {
            await batch.commit();
            batch = db.batch();
        }
    }
    if (count % 400)
        await batch.commit();
    console.log(`Seeded ${count} ${name} documents.`);
}
await seedCollection('districts', districtFixtures);
await seedCollection('stops', stopFixtures);
await seedCollection('routes', routeFixtures);
await seedCollection('buses', busFleetFixtures);
await seedCollection('crew', crewFixtures);
await seedCollection('trips', tripFixtures());
let demoTravellerUid = '';
for (const account of demoAccounts) {
    const email = authEmail(account.identifier, account.role);
    let user;
    try {
        user = await getAuth().getUserByEmail(email);
    }
    catch {
        user = await getAuth().createUser({ email, password: account.password, displayName: account.displayName });
    }
    const crew = crewFixtures.find((member) => member.id === account.identifier);
    await getAuth().setCustomUserClaims(user.uid, {
        role: account.role,
        ...(crew ? { dutyId: crew.id, badgeId: account.driverId } : {}),
        ...(account.role === 'operations' ? { admin: true } : {})
    });
    if (account.role === 'traveller')
        demoTravellerUid = user.uid;
    if (account.role === 'traveller') {
        try {
            const phoneAlias = await getAuth().createUser({ email: '9876500000@phone.vazhi.app', password: account.password, displayName: account.displayName });
            await getAuth().setCustomUserClaims(phoneAlias.uid, { role: 'traveller' });
        }
        catch { /* idempotent alias */ }
    }
}
if (demoTravellerUid) {
    const entries = canonicalManifest();
    const byPnr = new Map();
    for (const entry of entries)
        byPnr.set(entry.pnr, [...(byPnr.get(entry.pnr) ?? []), entry]);
    const tripRef = db.collection('trips').doc('setc-ultra-deluxe-0830');
    /*
        WHO OWNS THESE BOOKINGS.

        The canonical coach is nearly full, which is what makes the conductor's
        boarding view worth looking at — thirty-odd references to check off. Those
        seats belong to other passengers, not to the person running the demo.

        Every one of them used to be written with `travellerId: demoTravellerUid`,
        so My Trips opened on thirty identical Salem → Chennai journeys and the
        demo traveller appeared to have booked the entire bus. Only a couple are
        theirs now; the rest are owned by a placeholder id that matches no Auth
        account, so nobody can read them and the manifest stays full.
    */
    const OTHER_PASSENGERS = 'seed-other-passengers';
    const travellerOwned = [...byPnr.keys()].slice(0, 2);
    for (const [pnr, group] of byPnr) {
        const template = canonicalBooking();
        const seatIds = group.map((entry) => entry.seatId);
        const passengers = seatIds.map((seatId) => ({ bookingId: pnr, seatId, name: 'Passenger' }));
        await db.collection('bookings').doc(pnr).set({
            ...template,
            id: pnr,
            pnr,
            travellerId: travellerOwned.includes(pnr) ? demoTravellerUid : OTHER_PASSENGERS,
            busId: 'bus-tn01an1234',
            seatIds,
            passengerCount: seatIds.length,
            passengers,
            status: group.every((entry) => entry.ticketStatus === 'cancelled') ? 'cancelled' : 'confirmed',
            createdAt: FieldValue.serverTimestamp()
        }, { merge: true });
        for (const entry of group) {
            await tripRef.collection('seats').doc(entry.seatId).set({
                state: 'booked',
                bookingId: pnr,
                ownerId: travellerOwned.includes(pnr) ? demoTravellerUid : OTHER_PASSENGERS,
                updatedAt: FieldValue.serverTimestamp()
            });
            await tripRef.collection('manifest').doc(`${pnr}_${entry.seatId}`).set({
                bookingId: pnr, pnr, seatId: entry.seatId,
                ticketStatus: entry.ticketStatus, boardingStatus: entry.boardingStatus,
                boarded: entry.boardingStatus === 'boarded',
                ...(entry.boardedAt ? { boardedAt: entry.boardedAt } : {})
            });
        }
    }
}
console.log('Seed complete. No passenger profiles, contact details, or service credentials were written.');
