import { randomBytes } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore, type QuerySnapshot } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { createOrder, fetchPaymentMethod, verifySignature } from './razorpay.js';
import {
	ticketEmailHtml,
	ticketEmailSubject,
	ticketEmailText,
	type TicketBooking
} from './ticket-email.js';

initializeApp();
const db = getFirestore();
const region = 'asia-south1';
const callableOptions = { region };

/*
	Razorpay credentials, held in Firebase Secret Manager.

	Neither value exists in this repository. They are bound only to the two
	functions that need them, so nothing else in the codebase — and nothing in
	the browser bundle — can reach the key secret. The key id is publishable and
	the frontend has its own copy as VITE_RAZORPAY_KEY_ID; it is kept here too so
	a deployment needs no committed configuration at all.
*/
const razorpayKeyId = defineSecret('RAZORPAY_KEY_ID');
const razorpayKeySecret = defineSecret('RAZORPAY_KEY_SECRET');

const roles = ['traveller', 'conductor', 'driver', 'operations'] as const;
type Role = (typeof roles)[number];
const crewRoles = ['conductor', 'driver'] as const;
type CrewRole = (typeof crewRoles)[number];
const crewStatuses = ['available', 'assigned', 'on-trip', 'off-duty'] as const;

function requireAuth(request: { auth?: { uid: string; token: Record<string, unknown> } }): { uid: string; role: Role; dutyId?: string } {
	if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');
	const role = request.auth.token.role;
	if (typeof role !== 'string' || !roles.includes(role as Role)) {
		throw new HttpsError('permission-denied', 'A valid role claim is required.');
	}
	return {
		uid: request.auth.uid,
		role: role as Role,
		dutyId: typeof request.auth.token.dutyId === 'string' ? request.auth.token.dutyId : undefined
	};
}

function requireRole(request: Parameters<typeof requireAuth>[0], allowed: Role[]) {
	const caller = requireAuth(request);
	if (!allowed.includes(caller.role)) throw new HttpsError('permission-denied', 'Role is not permitted.');
	return caller;
}

function crewEmail(dutyId: string): string {
	return `${dutyId.toLocaleLowerCase('en')}@crew.vazhi.app`;
}

function crewBadgeId(): string {
	const value = Number.parseInt(randomBytes(2).toString('hex'), 16) % 10_000;
	return `TN-DVR-${String(value).padStart(4, '0')}`;
}

function strings(value: unknown, max = 6): string[] {
	if (!Array.isArray(value) || value.length < 1 || value.length > max) {
		throw new HttpsError('invalid-argument', 'A non-empty seat list is required.');
	}
	const list = value.map((item) => (typeof item === 'string' ? item.trim().toUpperCase() : ''));
	if (list.some((item) => !item) || new Set(list).size !== list.length) {
		throw new HttpsError('invalid-argument', 'Seat identifiers must be unique strings.');
	}
	return list;
}

function seatExists(seatId: string, capacity: number, layout: string): boolean {
	const match = /^(\d{1,2})([A-D])$/.exec(seatId);
	if (!match) return false;
	const columns = layout === '2+1' ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D'];
	const row = Number(match[1]);
	const column = match[2];
	const ordinal = (row - 1) * columns.length + columns.indexOf(column) + 1;
	return row > 0 && columns.includes(column) && ordinal <= capacity;
}

function isBookable(trip: Record<string, unknown>): boolean {
	return trip.sellable === true && ['scheduled', 'published', 'boarding'].includes(String(trip.status));
}

function tripDurationMinutes(departure: unknown, arrival: unknown): number {
	const parse = (value: unknown): number | null => {
		if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return null;
		const [hours, minutes] = value.split(':').map(Number);
		if (hours > 23 || minutes > 59) return null;
		return hours * 60 + minutes;
	};
	const start = parse(departure);
	const end = parse(arrival);
	if (start === null || end === null || start === end) return 0;
	return end > start ? end - start : end + 1440 - start;
}

export const verifyDutyIdentity = onCall(callableOptions, async (request) => {
	const caller = requireRole(request, ['conductor', 'driver']);
	const badgeId = typeof request.data?.badgeId === 'string' ? request.data.badgeId.trim().toUpperCase() : '';
	if (!badgeId || request.auth?.token.badgeId !== badgeId || !caller.dutyId) {
		throw new HttpsError('permission-denied', 'Duty identity did not match.');
	}
	return { valid: true as const };
});

export const registerTraveller = onCall(callableOptions, async (request) => {
	if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');
	const existingRole = request.auth.token.role;
	if (request.auth.token.admin === true || (existingRole && existingRole !== 'traveller')) {
		throw new HttpsError('permission-denied', 'This account cannot become a traveller account.');
	}
	const displayName = typeof request.data?.displayName === 'string' ? request.data.displayName.trim() : '';
	if (displayName.length < 2 || displayName.length > 60) {
		throw new HttpsError('invalid-argument', 'A name between 2 and 60 characters is required.');
	}
	const user = await getAuth().getUser(request.auth.uid);
	const claims = user.customClaims ?? {};
	if (claims.admin === true || (claims.role && claims.role !== 'traveller')) {
		throw new HttpsError('permission-denied', 'This account cannot become a traveller account.');
	}
	await getAuth().updateUser(user.uid, { displayName });
	await getAuth().setCustomUserClaims(user.uid, { ...claims, role: 'traveller' });
	return { registered: true as const };
});

export const createCrewWithAccount = onCall(callableOptions, async (request) => {
	const caller = requireRole(request, ['operations']);
	const input = request.data?.member as Record<string, unknown> | undefined;
	const dutyId = typeof input?.id === 'string' ? input.id.trim().toUpperCase() : '';
	const role = input?.role;
	const name = typeof input?.name === 'string' ? input.name.trim() : '';
	const depot = typeof input?.depot === 'string' ? input.depot.trim() : '';
	const status = input?.status;
	const initialPassword =
		typeof request.data?.initialPassword === 'string' ? request.data.initialPassword : '';
	const expectedPrefix = role === 'driver' ? 'DRV' : role === 'conductor' ? 'CON' : '';
	if (
		!crewRoles.includes(role as CrewRole) ||
		!new RegExp(`^${expectedPrefix}-\\d{3}$`).test(dutyId) ||
		name.length < 2 ||
		name.length > 80 ||
		depot.length < 2 ||
		depot.length > 80 ||
		initialPassword.length < 8 ||
		initialPassword.length > 128 ||
		!crewStatuses.includes(status as (typeof crewStatuses)[number])
	) {
		throw new HttpsError('invalid-argument', 'A valid crew record is required.');
	}

	const crewRef = db.collection('crew').doc(dutyId);
	if ((await crewRef.get()).exists) throw new HttpsError('already-exists', 'That duty ID already exists.');

	const badgeId = crewBadgeId();
	let user;
	try {
		user = await getAuth().createUser({
			email: crewEmail(dutyId),
			password: initialPassword,
			displayName: name,
			disabled: false
		});
	} catch (error) {
		if ((error as { code?: string }).code === 'auth/email-already-exists') {
			throw new HttpsError('already-exists', 'A sign-in account already exists for that duty ID.');
		}
		throw error;
	}

	try {
		await getAuth().setCustomUserClaims(user.uid, { role, dutyId, badgeId });
		await crewRef.create({
			id: dutyId,
			role,
			name,
			depot,
			status,
			aliases: [],
			updatedAt: FieldValue.serverTimestamp()
		});
	} catch (error) {
		await getAuth().deleteUser(user.uid).catch(() => undefined);
		throw error;
	}

	logger.info('Crew member and sign-in account created', {
		dutyId,
		role,
		callerUid: caller.uid
	});
	return {
		member: { id: dutyId, role, name, depot, status, aliases: [] },
		credentials: { identifier: dutyId, badgeId }
	};
});

export const setUserRole = onCall(callableOptions, async (request) => {
	const caller = requireAuth(request);
	const targetUid = typeof request.data?.uid === 'string' ? request.data.uid.trim() : '';
	const requestedRole = request.data?.role;
	if (!targetUid || typeof requestedRole !== 'string' || !roles.includes(requestedRole as Role)) {
		throw new HttpsError('invalid-argument', 'A valid uid and role are required.');
	}
	const isAdmin = request.auth?.token.admin === true;
	if (!isAdmin && caller.role !== 'operations') throw new HttpsError('permission-denied', 'Not authorized.');
	if (requestedRole === 'operations' && !isAdmin) {
		throw new HttpsError('permission-denied', 'Only an administrator may assign operations access.');
	}
	const target = await getAuth().getUser(targetUid);
	const existing = target.customClaims ?? {};
	if (!isAdmin && (existing.admin === true || existing.role === 'operations')) {
		throw new HttpsError('permission-denied', 'Only an administrator may change a privileged account.');
	}
	const next: Record<string, unknown> = { role: requestedRole };
	if (crewRoles.includes(requestedRole as CrewRole)) {
		const dutyId = typeof request.data?.dutyId === 'string' ? request.data.dutyId.trim().toUpperCase() : '';
		const prefix = requestedRole === 'driver' ? 'DRV' : 'CON';
		if (!new RegExp(`^${prefix}-\\d{3}$`).test(dutyId)) {
			throw new HttpsError('invalid-argument', 'A valid crew duty ID is required.');
		}
		next.dutyId = dutyId;
		const badgeId = typeof request.data?.badgeId === 'string' ? request.data.badgeId.trim().toUpperCase() : '';
		if (!/^TN-DVR-\d{4}$/.test(badgeId)) throw new HttpsError('invalid-argument', 'A valid crew badge is required.');
		next.badgeId = badgeId;
	}
	if (isAdmin && existing.admin === true) next.admin = true;
	await getAuth().setCustomUserClaims(targetUid, next);
	logger.info('User role updated', { targetUid, role: requestedRole, callerUid: caller.uid });
	return { updated: true };
});

export const holdSeats = onCall(callableOptions, async (request) => {
	const caller = requireRole(request, ['traveller']);
	const tripId = typeof request.data?.tripId === 'string' ? request.data.tripId.trim() : '';
	const seatIds = strings(request.data?.seatIds);
	if (!tripId) throw new HttpsError('invalid-argument', 'tripId is required.');
	const holdId = randomBytes(16).toString('hex');
	const now = Timestamp.now();
	const expiresAt = Timestamp.fromMillis(now.toMillis() + 5 * 60_000);

	await db.runTransaction(async (tx) => {
		const tripRef = db.collection('trips').doc(tripId);
		const tripSnap = await tx.get(tripRef);
		if (!tripSnap.exists || !isBookable(tripSnap.data()!)) {
			throw new HttpsError('failed-precondition', 'This trip is no longer bookable.');
		}
		const trip = tripSnap.data()!;
		const busSnap = await tx.get(db.collection('buses').doc(String(trip.busId)));
		if (!busSnap.exists) throw new HttpsError('failed-precondition', 'Trip vehicle is unavailable.');
		const bus = busSnap.data()!;
		if (seatIds.some((id) => !seatExists(id, Number(bus.totalSeats ?? bus.capacity), String(bus.seatLayout)))) {
			throw new HttpsError('invalid-argument', 'One or more seats do not exist.');
		}
		const refs = seatIds.map((id) => tripRef.collection('seats').doc(id));
		const snapshots = await Promise.all(refs.map((ref) => tx.get(ref)));
		for (const snap of snapshots) {
			const value = snap.data();
			if (value?.state === 'booked') throw new HttpsError('already-exists', 'A seat is already booked.');
			if (value?.state === 'held' && value.expiresAt instanceof Timestamp && value.expiresAt.toMillis() > now.toMillis()) {
				throw new HttpsError('already-exists', 'A seat is already held.');
			}
		}
		refs.forEach((ref) => tx.set(ref, { state: 'held', holdId, ownerId: caller.uid, expiresAt, updatedAt: now }));
	});
	return { holdId, tripId, seatIds, expiresAt: expiresAt.toDate().toISOString() };
});

export const getSeatAvailability = onCall(callableOptions, async (request) => {
	requireRole(request, ['traveller']);
	const tripId = typeof request.data?.tripId === 'string' ? request.data.tripId.trim() : '';
	if (!tripId) throw new HttpsError('invalid-argument', 'tripId is required.');
	const trip = await db.collection('trips').doc(tripId).get();
	if (!trip.exists || !isBookable(trip.data()!)) throw new HttpsError('failed-precondition', 'Trip is not bookable.');
	const seats = await trip.ref.collection('seats').get();
	const now = Timestamp.now().toMillis();
	const blockedSeatIds = seats.docs
		.filter((doc) => {
			const value = doc.data();
			return value.state === 'booked' ||
				(value.state === 'held' && value.expiresAt instanceof Timestamp && value.expiresAt.toMillis() > now);
		})
		.map((doc) => doc.id);
	return { blockedSeatIds };
});

export const searchTrips = onCall(callableOptions, async (request) => {
	const serviceDate = typeof request.data?.serviceDate === 'string' ? request.data.serviceDate : '';
	if (!/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)) throw new HttpsError('invalid-argument', 'A service date is required.');
	const snapshot = await db.collection('trips')
		.where('serviceDate', '==', serviceDate)
		.where('sellable', '==', true)
		.where('status', 'in', ['scheduled', 'published', 'boarding'])
		.get();
	return {
		trips: snapshot.docs.map((doc) => {
			const value = doc.data();
			return {
				id: doc.id, code: value.code, routeId: value.routeId, busId: value.busId,
				serviceName: value.serviceName, serviceDate: value.serviceDate,
				departureTime: value.departureTime, arrivalTime: value.arrivalTime,
				boardingStopId: value.boardingStopId, destinationStopId: value.destinationStopId,
				platform: value.platform ?? null, status: value.status,
				baseFare: value.baseFare, taxes: value.taxes, seatsAvailable: value.seatsAvailable,
				distanceKm: value.distanceKm ?? null, sellable: true,
				canonical: value.canonical === true, highlights: Array.isArray(value.highlights) ? value.highlights : []
			};
		})
	};
});

type PassengerInput = { seatId: string; name: string; concessionType?: string };

/**
 * Per-passenger fare for a trip, in paise. The single source of the amount.
 *
 * Every figure a traveller is charged comes from here, read from the trip
 * document — never from the browser. The checkout order and the booking record
 * are computed from the same call, so the amount presented at the gateway and
 * the amount stored on the ticket cannot disagree.
 */
function fareForTrip(trip: Record<string, unknown>, seatCount: number) {
	const baseFarePerPassenger = Number(trip.baseFare);
	const taxesPerPassenger = Number(trip.taxes);
	const baseFare = baseFarePerPassenger * seatCount;
	const taxes = taxesPerPassenger * seatCount;
	return {
		passengerCount: seatCount,
		baseFarePerPassenger,
		taxesPerPassenger,
		baseFare,
		taxes,
		concessionDiscount: 0,
		concessionRequested: false,
		total: baseFare + taxes
	};
}

interface PaymentEvidence {
	razorpayOrderId: string;
	razorpayPaymentId: string;
	/** What Razorpay reports was used: `upi`, `card`, `netbanking`, `wallet`… */
	method: string;
}

/**
 * Turns a seat hold into a booking. Only reachable once payment is verified.
 *
 * Extracted from what used to be the `confirmBooking` callable so there is
 * exactly one path that creates a booking, and it runs *after* a Razorpay
 * signature has been checked. When this was a callable of its own, a client
 * could have called it directly and been issued a ticket without paying.
 */
async function createBookingFromHold(
	caller: { uid: string },
	input: {
		tripId: string;
		holdId: string;
		seatIds: string[];
		passengers: PassengerInput[];
	},
	payment: PaymentEvidence
) {
	const { tripId, holdId, seatIds, passengers } = input;

	for (let attempt = 0; attempt < 5; attempt++) {
		const pnr = `VZ-${randomBytes(5).toString('hex').toUpperCase()}`;
		try {
			return await db.runTransaction(async (tx) => {
				const tripRef = db.collection('trips').doc(tripId);
				const bookingRef = db.collection('bookings').doc(pnr);
				const [tripSnap, bookingSnap] = await Promise.all([tx.get(tripRef), tx.get(bookingRef)]);
				if (bookingSnap.exists) throw new HttpsError('already-exists', 'PNR collision.');
				if (!tripSnap.exists || !isBookable(tripSnap.data()!)) throw new HttpsError('failed-precondition', 'Trip is not bookable.');
				const trip = tripSnap.data()!;
				const busSnap = await tx.get(db.collection('buses').doc(String(trip.busId)));
				const routeSnap = await tx.get(db.collection('routes').doc(String(trip.routeId)));
				if (!busSnap.exists || !routeSnap.exists) throw new HttpsError('failed-precondition', 'Trip data is incomplete.');
				const seatRefs = seatIds.map((id) => tripRef.collection('seats').doc(id));
				const seatSnaps = await Promise.all(seatRefs.map((ref) => tx.get(ref)));
				const now = Timestamp.now();
				for (const snap of seatSnaps) {
					const value = snap.data();
					if (value?.state !== 'held' || value.holdId !== holdId || value.ownerId !== caller.uid || !(value.expiresAt instanceof Timestamp) || value.expiresAt.toMillis() <= now.toMillis()) {
						throw new HttpsError('failed-precondition', 'Seat hold has expired or is not owned by this user.');
					}
				}
				const count = seatIds.length;
				const fare = {
					...fareForTrip(trip, count),
					concessionRequested: passengers.some((p) => p.concessionType)
				};
				const bus = busSnap.data()!;
				const route = routeSnap.data()!;
				const stops = Array.isArray(route.stops) ? route.stops : [];
				const origin = stops.find((s: Record<string, unknown>) => s.stopId === trip.boardingStopId);
				const destination = stops.find((s: Record<string, unknown>) => s.stopId === trip.destinationStopId);
				const persistedPassengers = passengers.map((passenger) => ({ bookingId: pnr, ...passenger }));
				const booking = {
					id: pnr, pnr, travellerId: caller.uid, tripId, busId: trip.busId,
					status: 'confirmed', serviceName: trip.serviceName,
					vehicleNumber: bus.registrationNumber,
					originStopId: trip.boardingStopId, destinationStopId: trip.destinationStopId,
					originName: origin?.name ?? trip.boardingStopId,
					destinationName: destination?.name ?? trip.destinationStopId,
					departure: trip.departureTime, arrival: trip.arrivalTime,
					durationMinutes: Number(trip.durationMinutes ?? 0), distanceKm: Number(trip.distanceKm ?? route.distanceKm ?? 0),
					boardingPlatform: trip.platform ?? '--', travelDate: trip.serviceDate,
					seatIds, passengerCount: count, fare,
					paymentMethod: payment.method,
					// Payment evidence. `paid` is only ever written after a Razorpay
					// signature has been verified against the key secret.
					paymentStatus: 'paid',
					razorpayOrderId: payment.razorpayOrderId,
					razorpayPaymentId: payment.razorpayPaymentId,
					passengers: persistedPassengers, createdAt: now, bookedAt: now.toDate().toISOString()
				};
				tx.create(bookingRef, booking);
				seatRefs.forEach((ref) => tx.set(ref, { state: 'booked', bookingId: pnr, ownerId: caller.uid, updatedAt: now }));
				// PRIVACY: the manifest is a boarding projection, not a passenger list.
				passengers.forEach((passenger) => {
					tx.create(tripRef.collection('manifest').doc(`${pnr}_${passenger.seatId}`), {
						bookingId: pnr, pnr, seatId: passenger.seatId,
						ticketStatus: 'valid', boardingStatus: 'pending', boarded: false, createdAt: now
					});
				});
				tx.update(tripRef, { seatsAvailable: FieldValue.increment(-count), updatedAt: now });
				return { booking };
			});
		} catch (error) {
			if (error instanceof HttpsError && error.code === 'already-exists' && error.message === 'PNR collision.') continue;
			logger.error('Booking confirmation failed', { tripId, uid: caller.uid, code: error instanceof HttpsError ? error.code : 'internal' });
			throw error;
		}
	}
	throw new HttpsError('internal', 'Could not allocate a unique PNR.');
}

/** Shape-checks the checkout payload a browser sends back. */
function bookingInputFrom(request: { data?: Record<string, unknown> }) {
	const tripId = typeof request.data?.tripId === 'string' ? request.data.tripId.trim() : '';
	const holdId = typeof request.data?.holdId === 'string' ? request.data.holdId.trim() : '';
	const seatIds = strings(request.data?.seatIds);
	const rawPassengers = Array.isArray(request.data?.passengers) ? request.data.passengers : [];
	const passengers: PassengerInput[] = rawPassengers.map((item: unknown) => {
		const input = item as Record<string, unknown>;
		return {
			seatId: typeof input.seatId === 'string' ? input.seatId.trim().toUpperCase() : '',
			name: typeof input.name === 'string' ? input.name.trim().slice(0, 80) : '',
			...(typeof input.concessionType === 'string' && input.concessionType !== 'none'
				? { concessionType: input.concessionType }
				: {})
		};
	});
	if (!tripId || !holdId || passengers.length !== seatIds.length || passengers.some((p) => !p.name || !seatIds.includes(p.seatId))) {
		throw new HttpsError('invalid-argument', 'Trip, hold, seats, and passenger snapshots must match.');
	}
	return { tripId, holdId, seatIds, passengers };
}

/**
 * Opens a Razorpay order for a held set of seats.
 *
 * THE AMOUNT IS NOT NEGOTIABLE. It is read from the trip document and
 * multiplied by the number of seats actually held by this caller; the browser
 * sends no figure and could not change one if it did. The hold is verified
 * first, so an order can only exist for seats this traveller is really holding.
 *
 * `receipt` carries the hold id, which is what ties a Razorpay order in the
 * dashboard back to a VAZHI booking once the PNR is issued.
 */
export const createPaymentOrder = onCall(
	{ ...callableOptions, secrets: [razorpayKeyId, razorpayKeySecret] },
	async (request) => {
		const caller = requireRole(request, ['traveller']);
		const tripId = typeof request.data?.tripId === 'string' ? request.data.tripId.trim() : '';
		const holdId = typeof request.data?.holdId === 'string' ? request.data.holdId.trim() : '';
		const seatIds = strings(request.data?.seatIds);
		if (!tripId || !holdId) throw new HttpsError('invalid-argument', 'A trip and a seat hold are required.');

		const tripSnap = await db.collection('trips').doc(tripId).get();
		if (!tripSnap.exists || !isBookable(tripSnap.data()!)) {
			throw new HttpsError('failed-precondition', 'This trip is no longer bookable.');
		}

		// The hold proves these seats are this traveller's to pay for.
		const now = Timestamp.now();
		const seatSnaps = await Promise.all(
			seatIds.map((id) => tripSnap.ref.collection('seats').doc(id).get())
		);
		for (const snap of seatSnaps) {
			const value = snap.data();
			if (
				value?.state !== 'held' ||
				value.holdId !== holdId ||
				value.ownerId !== caller.uid ||
				!(value.expiresAt instanceof Timestamp) ||
				value.expiresAt.toMillis() <= now.toMillis()
			) {
				throw new HttpsError('failed-precondition', 'Seat hold has expired or is not owned by this user.');
			}
		}

		const fare = fareForTrip(tripSnap.data()!, seatIds.length);
		if (!Number.isInteger(fare.total) || fare.total < 100) {
			logger.error('Refusing to open an order for an implausible amount', { tripId, total: fare.total });
			throw new HttpsError('failed-precondition', 'This service has no payable fare.');
		}

		try {
			const order = await createOrder(razorpayKeyId.value(), razorpayKeySecret.value(), {
				amountPaise: fare.total,
				receipt: holdId,
				notes: { tripId, seats: seatIds.join(',') }
			});
			logger.info('Razorpay order created', { tripId, orderId: order.id, amount: order.amount });
			return { order_id: order.id, amount: order.amount, currency: order.currency };
		} catch (error) {
			if (error instanceof Error && error.message === 'amount_out_of_range') {
				throw new HttpsError('failed-precondition', 'This service has no payable fare.');
			}
			logger.error('Razorpay order creation failed', {
				tripId,
				message: error instanceof Error ? error.message : 'unknown'
			});
			throw new HttpsError('internal', 'The payment provider could not open an order.');
		}
	}
);

/**
 * Verifies a completed checkout and issues the ticket.
 *
 * This is the only way a booking comes into existence. The signature is
 * recomputed from the key secret over `order_id|payment_id`; a browser can
 * invent the ids but not a signature over them, so a forged success cannot buy
 * a seat. Only once it matches is the hold turned into a booking, and only then
 * is `paymentStatus: 'paid'` written.
 *
 * A mismatch is logged and refused. Nothing is created, nothing is charged, and
 * the seats stay held until their hold expires on its own.
 */
export const verifyPayment = onCall(
	{ ...callableOptions, secrets: [razorpayKeyId, razorpayKeySecret] },
	async (request) => {
		const caller = requireRole(request, ['traveller']);
		const orderId = typeof request.data?.razorpay_order_id === 'string' ? request.data.razorpay_order_id : '';
		const paymentId = typeof request.data?.razorpay_payment_id === 'string' ? request.data.razorpay_payment_id : '';
		const signature = typeof request.data?.razorpay_signature === 'string' ? request.data.razorpay_signature : '';
		if (!orderId || !paymentId || !signature) {
			throw new HttpsError('invalid-argument', 'Order, payment, and signature are all required.');
		}

		if (!verifySignature(razorpayKeySecret.value(), orderId, paymentId, signature)) {
			logger.warn('Rejected a payment whose signature did not verify', { orderId, uid: caller.uid });
			throw new HttpsError('permission-denied', 'Payment signature did not verify.');
		}

		const input = bookingInputFrom(request);

		// Deliberately before the transaction: a network round trip inside one
		// would hold seat locks open for the length of an external call.
		// `fetchPaymentMethod` swallows its own failures and returns null, so a
		// paid booking is never lost to a reporting lookup.
		const method =
			(await fetchPaymentMethod(razorpayKeyId.value(), razorpayKeySecret.value(), paymentId)) ??
			'razorpay';

		const result = await createBookingFromHold(caller, input, {
			razorpayOrderId: orderId,
			razorpayPaymentId: paymentId,
			method
		});
		logger.info('Payment verified and booking issued', { pnr: result.booking.pnr, orderId });
		return result;
	}
);

export const cancelBooking = onCall(callableOptions, async (request) => {
	const caller = requireRole(request, ['traveller']);
	const pnr = typeof request.data?.pnr === 'string' ? request.data.pnr.trim().toUpperCase() : '';
	if (!pnr) throw new HttpsError('invalid-argument', 'PNR is required.');
	return db.runTransaction(async (tx) => {
		const bookingRef = db.collection('bookings').doc(pnr);
		const bookingSnap = await tx.get(bookingRef);
		if (!bookingSnap.exists) throw new HttpsError('not-found', 'Booking not found.');
		const booking = bookingSnap.data()!;
		if (booking.travellerId !== caller.uid) throw new HttpsError('permission-denied', 'Booking is not owned by caller.');
		if (booking.status !== 'confirmed') throw new HttpsError('failed-precondition', 'Booking cannot be cancelled.');
		const tripRef = db.collection('trips').doc(String(booking.tripId));
		const tripSnap = await tx.get(tripRef);
		if (!tripSnap.exists || ['departed', 'in-transit', 'completed'].includes(String(tripSnap.data()!.status))) {
			throw new HttpsError('failed-precondition', 'Trip has already departed.');
		}
		const seatIds = Array.isArray(booking.seatIds) ? booking.seatIds.map(String) : [];
		tx.update(bookingRef, {
			status: 'cancelled',
			refund: { status: 'simulated_pending', requestedAt: FieldValue.serverTimestamp() },
			updatedAt: FieldValue.serverTimestamp()
		});
		seatIds.forEach((seatId: string) => tx.delete(tripRef.collection('seats').doc(seatId)));
		seatIds.forEach((seatId: string) => tx.update(tripRef.collection('manifest').doc(`${pnr}_${seatId}`), {
			ticketStatus: 'cancelled', updatedAt: FieldValue.serverTimestamp()
		}));
		tx.update(tripRef, { seatsAvailable: FieldValue.increment(seatIds.length), updatedAt: FieldValue.serverTimestamp() });
		return { refundId: `RF-${pnr.replace(/^VZ-/, '')}` };
	});
});

function overlaps(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
	if (a.serviceDate !== b.serviceDate) return false;
	const minutes = (value: unknown) => {
		const [h, m] = String(value).split(':').map(Number);
		return h * 60 + m;
	};
	let aEnd = minutes(a.arrivalTime); if (aEnd <= minutes(a.departureTime)) aEnd += 1440;
	let bEnd = minutes(b.arrivalTime); if (bEnd <= minutes(b.departureTime)) bEnd += 1440;
	return minutes(a.departureTime) < bEnd && minutes(b.departureTime) < aEnd;
}

async function assignmentConflicts(draft: Record<string, unknown>, excludeId?: string) {
	const snap = await db.collection('trips').where('serviceDate', '==', draft.serviceDate).get();
	return conflictsInSnapshot(draft, snap, excludeId);
}

function conflictsInSnapshot(draft: Record<string, unknown>, snap: QuerySnapshot, excludeId?: string) {
	return snap.docs.flatMap((doc) => {
		const trip = doc.data();
		if (doc.id === excludeId || trip.status === 'cancelled' || !overlaps(draft, trip)) return [];
		return (['busId', 'driverId', 'conductorId'] as const)
			.filter((key) => trip[key] === draft[key])
			.map((key) => ({ kind: key.replace('Id', ''), tripId: doc.id, tripCode: trip.code }));
	});
}

export const validateTripAssignment = onCall(callableOptions, async (request) => {
	requireRole(request, ['operations']);
	const draft = request.data?.trip as Record<string, unknown>;
	if (!draft?.serviceDate || !draft.busId || !draft.driverId || !draft.conductorId) throw new HttpsError('invalid-argument', 'Trip assignment is incomplete.');
	return { conflicts: await assignmentConflicts(draft, typeof request.data?.excludeTripId === 'string' ? request.data.excludeTripId : undefined) };
});

export const saveTrip = onCall(callableOptions, async (request) => {
	requireRole(request, ['operations']);
	const trip = request.data?.trip as Record<string, unknown>;
	if (!trip?.id || !trip.routeId || !trip.busId || !trip.driverId || !trip.conductorId || !trip.serviceDate || !trip.departureTime || !trip.arrivalTime) {
		throw new HttpsError('invalid-argument', 'Trip is incomplete.');
	}
	await db.runTransaction(async (tx) => {
		const sameDay = await tx.get(db.collection('trips').where('serviceDate', '==', trip.serviceDate));
		const conflicts = conflictsInSnapshot(trip, sameDay, String(trip.id));
		if (conflicts.length) throw new HttpsError('failed-precondition', JSON.stringify({ conflicts }));
		tx.set(db.collection('trips').doc(String(trip.id)), { ...trip, updatedAt: FieldValue.serverTimestamp() }, { merge: false });
	});
	return { trip };
});

const lifecycle = ['draft', 'scheduled', 'published', 'boarding', 'departed', 'in-transit', 'completed'];
export const transitionTrip = onCall(callableOptions, async (request) => {
	const caller = requireRole(request, ['operations', 'driver', 'conductor']);
	const tripId = typeof request.data?.tripId === 'string' ? request.data.tripId : '';
	const to = typeof request.data?.status === 'string' ? request.data.status : '';
	return db.runTransaction(async (tx) => {
		const ref = db.collection('trips').doc(tripId);
		const snap = await tx.get(ref);
		if (!snap.exists) throw new HttpsError('not-found', 'Trip not found.');
		const trip = snap.data()!;
		if (caller.role === 'driver' && trip.driverId !== caller.dutyId) throw new HttpsError('permission-denied', 'Not assigned.');
		if (caller.role === 'conductor' && trip.conductorId !== caller.dutyId) throw new HttpsError('permission-denied', 'Not assigned.');
		const from = String(trip.status);
		const forward = lifecycle.indexOf(to) === lifecycle.indexOf(from) + 1;
		// Existing scheduled services can open boarding directly; newly managed
		// services may use the explicit published state first.
		const legacyBoarding = from === 'scheduled' && to === 'boarding';
		const allowed = to === 'cancelled'
			? caller.role === 'operations' && !['completed', 'cancelled'].includes(from)
			: forward || legacyBoarding;
		if (!allowed) throw new HttpsError('failed-precondition', 'Illegal trip transition.');
		tx.update(ref, { status: to, sellable: to === 'published' || to === 'boarding', updatedAt: FieldValue.serverTimestamp() });
		return { trip: { ...trip, status: to } };
	});
});

async function assignedTrip(dutyId: string, role: 'conductor' | 'driver') {
	const field = role === 'conductor' ? 'conductorId' : 'driverId';
	const snap = await db.collection('trips').where(field, '==', dutyId).where('status', 'in', ['scheduled', 'published', 'boarding', 'departed', 'in-transit']).limit(1).get();
	return snap.docs[0];
}

export const getAssignedTrip = onCall(callableOptions, async (request) => {
	const caller = requireRole(request, ['conductor', 'driver']);
	if (!caller.dutyId) throw new HttpsError('failed-precondition', 'Duty identity is missing.');
	const crewRole = caller.role as 'conductor' | 'driver';
	const tripDoc = await assignedTrip(caller.dutyId, crewRole);
	if (!tripDoc) throw new HttpsError('not-found', 'No assigned trip.');
	const value = tripDoc.data();
	const common = {
		id: tripDoc.id, code: value.code, routeId: value.routeId, busId: value.busId,
		serviceName: value.serviceName, serviceDate: value.serviceDate,
		departureTime: value.departureTime, arrivalTime: value.arrivalTime,
		boardingStopId: value.boardingStopId, destinationStopId: value.destinationStopId,
		platform: value.platform ?? null, status: value.status,
		baseFare: value.baseFare, taxes: value.taxes, seatsAvailable: value.seatsAvailable,
		distanceKm: value.distanceKm ?? null, sellable: value.sellable === true,
		canonical: value.canonical === true, highlights: Array.isArray(value.highlights) ? value.highlights : []
	};
	return {
		trip: crewRole === 'driver'
			? { ...common, driverId: caller.dutyId, conductorId: '' }
			: { ...common, conductorId: caller.dutyId, driverId: '' }
	};
});

export const verifyPnr = onCall(callableOptions, async (request) => {
	const caller = requireRole(request, ['conductor']);
	const pnr = typeof request.data?.pnr === 'string' ? request.data.pnr.trim().toUpperCase() : '';
	if (!pnr || !caller.dutyId) throw new HttpsError('invalid-argument', 'PNR is required.');
	const tripDoc = await assignedTrip(caller.dutyId, 'conductor');
	if (!tripDoc) throw new HttpsError('failed-precondition', 'No assigned trip.');
	const booking = await db.collection('bookings').doc(pnr).get();
	if (!booking.exists) return { outcome: 'not_found' };
	if (booking.data()!.tripId !== tripDoc.id) return { outcome: 'wrong_trip' };
	const manifest = await tripDoc.ref.collection('manifest').where('pnr', '==', pnr).get();
	const entries = manifest.docs.map((doc) => doc.data());
	if (booking.data()!.status === 'cancelled') return { outcome: 'cancelled', entry: entries[0], groupEntries: entries };
	if (entries.length && entries.every((entry) => entry.boardingStatus === 'boarded')) return { outcome: 'already_boarded', entry: entries[0], groupEntries: entries };
	return { outcome: 'valid', entry: entries[0], groupEntries: entries };
});

export const updateBoarding = onCall(callableOptions, async (request) => {
	const caller = requireRole(request, ['conductor']);
	const pnr = typeof request.data?.pnr === 'string' ? request.data.pnr.trim().toUpperCase() : '';
	const status = request.data?.status;
	if (!pnr || !caller.dutyId || !['pending', 'boarded'].includes(status)) throw new HttpsError('invalid-argument', 'Invalid boarding update.');
	const tripDoc = await assignedTrip(caller.dutyId, 'conductor');
	if (!tripDoc) throw new HttpsError('failed-precondition', 'No assigned trip.');
	const booking = await db.collection('bookings').doc(pnr).get();
	if (!booking.exists || booking.data()!.tripId !== tripDoc.id) throw new HttpsError('permission-denied', 'Booking is not on the assigned trip.');
	const manifest = await tripDoc.ref.collection('manifest').where('pnr', '==', pnr).get();
	const batch = db.batch();
	manifest.docs.forEach((doc) => batch.update(doc.ref, { boardingStatus: status, boarded: status === 'boarded', boardedAt: status === 'boarded' ? FieldValue.serverTimestamp() : FieldValue.delete() }));
	await batch.commit();
	return { entries: manifest.docs.map((doc) => ({ ...doc.data(), boardingStatus: status })) };
});

export const expireSeatHolds = onSchedule({ region, schedule: 'every 5 minutes' }, async () => {
	const expired = await db.collectionGroup('seats').where('state', '==', 'held').where('expiresAt', '<=', Timestamp.now()).limit(400).get();
	const batch = db.batch();
	expired.docs.forEach((doc) => batch.delete(doc.ref));
	await batch.commit();
	logger.info('Expired seat holds removed', { count: expired.size });
});


/**
 * Emails the ticket once a booking exists.
 *
 * A Firestore trigger rather than part of `confirmBooking`, deliberately. The
 * booking transaction must not be able to fail because a mail queue was slow,
 * and a traveller must never be told their seat was not booked when it was.
 * Writing the booking is the commitment; the email follows from it.
 *
 * DELIVERY. This writes a document to `mail/`, which the Firebase "Trigger
 * Email from Firestore" extension picks up and sends. Queuing, retries, and
 * SMTP credentials all belong to the extension, so no mail secret exists in
 * this codebase and no outbound call is made from here.
 *
 * PRIVACY. The destination address is read from the traveller's own Auth
 * record at send time and is never written to Firestore — the `to` field on
 * the queued message is the only place it appears, and that document is
 * unreadable by every client (see firestore.rules).
 */
export const sendTicketEmail = onDocumentCreated(
	{ region, document: 'bookings/{pnr}' },
	async (event) => {
		const booking = event.data?.data();
		if (!booking) return;
		const pnr = event.params.pnr;

		const travellerId = typeof booking.travellerId === 'string' ? booking.travellerId : '';
		if (!travellerId) {
			logger.warn('Booking has no traveller, ticket email skipped', { pnr });
			return;
		}

		let email: string | undefined;
		try {
			email = (await getAuth().getUser(travellerId)).email ?? undefined;
		} catch (error) {
			logger.error('Could not resolve traveller for ticket email', {
				pnr,
				code: (error as { code?: string }).code ?? 'unknown'
			});
			return;
		}
		if (!email) {
			// A phone-only account is legitimate; there is simply nowhere to send.
			logger.info('Traveller has no email address, ticket email skipped', { pnr });
			return;
		}

		const ticket: TicketBooking = {
			pnr,
			serviceName: String(booking.serviceName ?? ''),
			vehicleNumber: String(booking.vehicleNumber ?? ''),
			originName: String(booking.originName ?? ''),
			destinationName: String(booking.destinationName ?? ''),
			departure: String(booking.departure ?? ''),
			arrival: String(booking.arrival ?? ''),
			travelDate: String(booking.travelDate ?? ''),
			boardingPlatform: String(booking.boardingPlatform ?? '--'),
			seatIds: Array.isArray(booking.seatIds) ? booking.seatIds.map(String) : [],
			passengerCount: Number(booking.passengerCount ?? 0),
			passengers: Array.isArray(booking.passengers)
				? booking.passengers.map((entry: Record<string, unknown>) => ({
						seatId: String(entry.seatId ?? ''),
						name: String(entry.name ?? ''),
						...(entry.concessionType ? { concessionType: String(entry.concessionType) } : {})
					}))
				: [],
			fare: {
				baseFare: Number(booking.fare?.baseFare ?? 0),
				taxes: Number(booking.fare?.taxes ?? 0),
				total: Number(booking.fare?.total ?? 0)
			},
			paymentMethod: String(booking.paymentMethod ?? 'upi'),
			bookedAt: String(booking.bookedAt ?? '')
		};

		/*
			`create`, never `set`.

			Firestore triggers are at-least-once, so this function can run twice
			for one booking. The extension that drains this queue decides what to
			do by reading the `delivery` field it writes back onto the document —
			SUCCESS and ERROR are terminal and make it stop. Overwriting the
			document would erase that field, the extension would see an unhandled
			message, and the traveller would get the ticket a second time.

			Creating instead means a repeat run collides with the document already
			there and stops, which is what the PNR-based id is for.
		*/
		try {
			await db.collection('mail').doc(`ticket-${pnr}`).create({
				to: [email],
				message: {
					subject: ticketEmailSubject(ticket),
					text: ticketEmailText(ticket),
					html: ticketEmailHtml(ticket)
				}
			});
		} catch (error) {
			if ((error as { code?: number }).code === 6) {
				// ALREADY_EXISTS: this booking's ticket is already queued or sent.
				logger.info('Ticket email already queued, not queued again', { pnr });
				return;
			}
			throw error;
		}

		logger.info('Ticket email queued', { pnr });
	}
);
