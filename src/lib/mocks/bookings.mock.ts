import type { Booking } from '$types/booking';

/**
 * Booking fixtures.
 *
 * PRIVACY: none of these records contain — or can contain — a passenger name,
 * age, gender, phone, email, or ID. `Booking` has no field for any of them.
 * Historical trips are kept clearly separate from the canonical active journey.
 */

/** Reference used for the canonical example booking (seat 5C). */
export const CANONICAL_PNR = 'VZ-5C0830';

const canonicalFare = {
	passengerCount: 1,
	baseFarePerPassenger: 38000,
	taxesPerPassenger: 3000,
	baseFare: 38000,
	taxes: 3000,
	concessionDiscount: 0,
	concessionRequested: false,
	total: 41000
};

/** Days from today, so fixtures never drift into stale calendar dates. */
function isoDaysFromToday(offset: number): string {
	const date = new Date();
	date.setDate(date.getDate() + offset);
	const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
	return local.toISOString().slice(0, 10);
}

/**
 * The canonical Salem → Chennai booking, used whenever a ticket or
 * confirmation is opened directly and this session holds no booking of its
 * own. Seat 5C is the illustrative seat throughout.
 */
export function canonicalBooking(): Booking {
	return {
		pnr: CANONICAL_PNR,
		status: 'confirmed',
		tripId: 'setc-ultra-deluxe-0830',
		busId: 'setc-ultra-deluxe-0830',
		serviceName: 'SETC Ultra Deluxe',
		vehicleNumber: 'TN 01 AN 1234',
		originStopId: 'salem-new-bus-stand',
		destinationStopId: 'chennai-cmbt',
		originName: 'Salem New Bus Stand',
		destinationName: 'Chennai CMBT',
		departure: '08:30',
		arrival: '13:45',
		durationMinutes: 315,
		distanceKm: 350,
		boardingPlatform: '04',
		travelDate: isoDaysFromToday(0),
		seatIds: ['5C'],
		passengerCount: 1,
		fare: { ...canonicalFare },
		paymentMethod: 'upi',
		bookedAt: new Date().toISOString()
	};
}
