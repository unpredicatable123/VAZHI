import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '$lib/firebase/client';
import { mapFirebaseError } from '$lib/firebase/errors';
import type { ServiceResult } from '$types/common';
import type { Booking, Pnr, TripFilter } from '$types/booking';

function withValidDuration(booking: Booking): Booking {
	if (Number.isFinite(booking.durationMinutes) && booking.durationMinutes > 0) return booking;
	const minutesOf = (time: string) => {
		const [hours, minutes] = time.split(':').map(Number);
		return hours * 60 + minutes;
	};
	const start = minutesOf(booking.departure);
	const end = minutesOf(booking.arrival);
	const durationMinutes = end > start ? end - start : end + 1440 - start;
	return { ...booking, durationMinutes };
}

export async function getBooking(pnr: Pnr): Promise<ServiceResult<Booking>> {
	try {
		const { db } = requireFirebase();
		const snapshot = await getDoc(doc(db, 'bookings', pnr.trim().toUpperCase()));
		if (!snapshot.exists()) return { status: 'error', error: { code: 'not_found', messageKey: 'tracking_error_body' } };
		return { status: 'ok', data: withValidDuration(snapshot.data() as Booking) };
	} catch (error) {
		return { status: 'error', error: mapFirebaseError(error, 'tracking_error_body') };
	}
}

export async function listTrips(): Promise<ServiceResult<Booking[]>> {
	try {
		const { auth, db } = requireFirebase();
		if (!auth.currentUser) throw new Error('unauthenticated');
		const snapshots = await getDocs(
			query(
				collection(db, 'bookings'),
				where('travellerId', '==', auth.currentUser.uid),
				orderBy('createdAt', 'desc')
			)
		);
		return { status: 'ok', data: snapshots.docs.map((entry) => withValidDuration(entry.data() as Booking)) };
	} catch (error) {
		return { status: 'error', error: mapFirebaseError(error, 'tracking_error_body') };
	}
}

export function filterTrips(trips: Booking[], filter: TripFilter): Booking[] {
	return trips.filter((trip) => {
		if (filter === 'upcoming') return trip.status === 'confirmed';
		if (filter === 'completed') return trip.status === 'completed';
		return trip.status === 'cancelled';
	});
}

export async function cancelBooking(pnr: Pnr): Promise<ServiceResult<{ refundId: string }>> {
	try {
		const { functions } = requireFirebase();
		const result = await httpsCallable<{ pnr: string }, { refundId: string }>(functions, 'cancelBooking')({ pnr });
		return { status: 'ok', data: result.data };
	} catch (error) {
		return { status: 'error', error: mapFirebaseError(error, 'refund_error_body') };
	}
}
