import type { Paise } from '$types/common';
import type { RefundBreakdown } from '$types/booking';

/**
 * Cancellation rules and time calculations.
 */

const MIN_HOURS_BEFORE_DEPARTURE = 3;
const CANCELLATION_FEE_RATE = 0.2;

export interface CancellationEligibility {
	canCancel: boolean;
	hoursRemaining: number;
	minutesRemaining: number;
	reason?: string;
}

/**
 * Parses a service date (YYYY-MM-DD) and clock time (HH:MM) into a Date object.
 */
export function parseDepartureTimestamp(travelDate: string, departureTime: string): Date {
	const [year, month, day] = travelDate.split('-').map(Number);
	const [hours, minutes] = departureTime.split(':').map(Number);
	return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

/**
 * Checks if a booking has expired (travel date/departure time has passed and trip is uncompleted).
 */
export function isBookingExpired(
	booking: { travelDate: string; departure: string; status: string },
	now: Date = new Date()
): boolean {
	if (booking.status === 'expired') return true;
	if (booking.status !== 'confirmed') return false;
	const departure = parseDepartureTimestamp(booking.travelDate, booking.departure);
	return now.getTime() > departure.getTime();
}

/**
 * Checks if a booking is eligible for cancellation (at least 3 hours before departure).
 */
export function checkCancellationEligibility(
	travelDate: string,
	departureTime: string,
	now: Date = new Date()
): CancellationEligibility {
	const departure = parseDepartureTimestamp(travelDate, departureTime);
	const diffMs = departure.getTime() - now.getTime();

	if (diffMs <= 0) {
		return {
			canCancel: false,
			hoursRemaining: 0,
			minutesRemaining: 0,
			reason: 'Bus has already departed or service has started.'
		};
	}

	const hoursRemaining = diffMs / (1000 * 60 * 60);
	const minutesRemaining = Math.floor(diffMs / (1000 * 60));

	if (hoursRemaining < MIN_HOURS_BEFORE_DEPARTURE) {
		return {
			canCancel: false,
			hoursRemaining: Math.round(hoursRemaining * 10) / 10,
			minutesRemaining,
			reason: `Cancellations must be requested at least 3 hours before departure. (${Math.floor(minutesRemaining / 60)}h ${minutesRemaining % 60}m remaining)`
		};
	}

	return {
		canCancel: true,
		hoursRemaining: Math.round(hoursRemaining * 10) / 10,
		minutesRemaining
	};
}

/**
 * Calculates standard refund breakdown (80% refund, 20% cancellation fee).
 */
export function calculateRefundBreakdown(totalPaid: Paise): RefundBreakdown {
	const cancellationFee = Math.round(totalPaid * CANCELLATION_FEE_RATE);
	return {
		totalPaid,
		cancellationFee,
		estimatedRefund: totalPaid - cancellationFee
	};
}
