import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
	assertFails,
	assertSucceeds,
	initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const host = process.env.FIRESTORE_EMULATOR_HOST?.split(':') ?? ['127.0.0.1', '8080'];
const env = await initializeTestEnvironment({
	projectId: 'demo-vazhi',
	firestore: {
		host: host[0],
		port: Number(host[1]),
		rules: readFileSync(resolve('firestore.rules'), 'utf8')
	}
});

await env.withSecurityRulesDisabled(async (context) => {
	const db = context.firestore();
	await setDoc(doc(db, 'districts/salem'), { id: 'salem', name: 'Salem' });
	await setDoc(doc(db, 'stops/salem-stand'), { id: 'salem-stand', districtId: 'salem' });
	await setDoc(doc(db, 'routes/salem-chennai'), { id: 'salem-chennai', stops: [] });
	await setDoc(doc(db, 'buses/bus-1'), { id: 'bus-1', registrationNumber: 'TN 01 AA 0001' });
	await setDoc(doc(db, 'trips/trip-1'), {
		conductorId: 'CON-023', driverId: 'DRV-014', sellable: true, status: 'scheduled'
	});
	// Deliberately seeded WITH a name the real manifest never carries, so the
	// assertion below proves a conductor cannot write one in either.
	await setDoc(doc(db, 'trips/trip-1/manifest/booking-seat'), {
		pnr: 'VZ-TEST', seatId: '1A', passengerName: 'Should never be written',
		boardingStatus: 'pending', boarded: false, ticketStatus: 'valid'
	});
	await setDoc(doc(db, 'bookings/VZ-OWN'), { travellerId: 'traveller-a', tripId: 'trip-1' });
	await setDoc(doc(db, 'bookings/VZ-OTHER'), { travellerId: 'traveller-b', tripId: 'trip-1' });
});

const anonymous = env.unauthenticatedContext().firestore();
await assertSucceeds(getDoc(doc(anonymous, 'districts/salem')));
await assertSucceeds(getDoc(doc(anonymous, 'stops/salem-stand')));
await assertSucceeds(getDoc(doc(anonymous, 'routes/salem-chennai')));
await assertSucceeds(getDoc(doc(anonymous, 'buses/bus-1')));
await assertFails(getDoc(doc(anonymous, 'trips/trip-1')));
await assertFails(getDoc(doc(anonymous, 'bookings/VZ-OWN')));
await assertFails(getDoc(doc(anonymous, 'crew/CON-023')));

const traveller = env.authenticatedContext('traveller-a', { role: 'traveller' }).firestore();
await assertSucceeds(getDoc(doc(traveller, 'bookings/VZ-OWN')));
await assertFails(getDoc(doc(traveller, 'bookings/VZ-OTHER')));
await assertFails(getDoc(doc(traveller, 'trips/trip-1/manifest/booking-seat')));

const conductor = env.authenticatedContext('conductor-user', {
	role: 'conductor', dutyId: 'CON-023'
}).firestore();
await assertSucceeds(getDoc(doc(conductor, 'trips/trip-1/manifest/booking-seat')));
await assertSucceeds(updateDoc(doc(conductor, 'trips/trip-1/manifest/booking-seat'), {
	boardingStatus: 'boarded', boarded: true
}));
await assertFails(updateDoc(doc(conductor, 'trips/trip-1/manifest/booking-seat'), {
	passengerName: 'Changed'
}));

// The boundary that matters most: a conductor is scoped to THEIR trip, not to
// the conductor role. Without this, every conductor could read every manifest
// on the network.
const otherConductor = env.authenticatedContext('other-conductor', {
	role: 'conductor', dutyId: 'CON-999'
}).firestore();
await assertFails(getDoc(doc(otherConductor, 'trips/trip-1/manifest/booking-seat')));
await assertFails(updateDoc(doc(otherConductor, 'trips/trip-1/manifest/booking-seat'), {
	boardingStatus: 'boarded', boarded: true
}));

// A conductor may only flip boarding state, never mark a seat boarded while
// claiming it is pending.
await assertFails(updateDoc(doc(conductor, 'trips/trip-1/manifest/booking-seat'), {
	boardingStatus: 'boarded', boarded: false
}));
await assertFails(updateDoc(doc(conductor, 'trips/trip-1/manifest/booking-seat'), {
	ticketStatus: 'cancelled'
}));

const driver = env.authenticatedContext('driver-user', { role: 'driver', dutyId: 'DRV-014' }).firestore();
await assertFails(getDoc(doc(driver, 'trips/trip-1')));
await assertFails(getDoc(doc(driver, 'trips/trip-1/manifest/booking-seat')));
await assertFails(getDoc(doc(driver, 'bookings/VZ-OWN')));

const operations = env.authenticatedContext('ops-user', { role: 'operations' }).firestore();
await assertSucceeds(setDoc(doc(operations, 'buses/bus-test'), {
	id: 'bus-test', registrationNumber: 'TN 00 XX 0001', operator: 'Test',
	serviceType: 'Test', cabinClass: 'express', seatLayout: '2+2', totalSeats: 44,
	amenities: {}, accessibleBoardingPoint: false, status: 'active'
}));
await assertFails(setDoc(doc(operations, 'crew/CON-999'), {
	id: 'CON-999', role: 'conductor', name: 'Roster Name', depot: 'Salem',
	status: 'available', aliases: [], phone: 'not-allowed'
}));
await assertFails(setDoc(doc(operations, 'trips/trip-bypass'), {
	busId: 'bus-test', routeId: 'route-test'
}));

// The ticket-email queue holds traveller email addresses. No role may touch it.
for (const [who, database] of [
	['anonymous', anonymous],
	['traveller', traveller],
	['conductor', conductor],
	['operations', operations]
] as const) {
	await assertFails(getDoc(doc(database, 'mail/ticket-VZ-OWN')));
	await assertFails(setDoc(doc(database, 'mail/injected'), { to: ['x@example.com'] }));
	void who;
}

await env.cleanup();
console.log('Firestore rules tests passed.');
