import type { ServiceResult } from '$types/common';
import type { Booking, RefundRecord, RefundStep } from '$types/booking';
import { estimateRefund, pnrFromRefundId } from '$utils/refund-math';

import { simulateLatency } from './transport';
import { getBooking } from './bookings.service';

/**
 * Refund estimation and status.
 *
 * The canonical worked example from the specification is ₹410 paid, an ₹82
 * cancellation fee, and ₹328 estimated back. The fee is 20% of the total, so
 * the same rule reproduces that example exactly and still scales to multi-seat
 * bookings.
 */

function buildSteps(requestedAt: Date, expectedBy: string): RefundStep[] {
	return [
		{ id: 'requested', titleKey: 'refund_step_requested', state: 'done' },
		{ id: 'confirmed', titleKey: 'refund_step_confirmed', state: 'done' },
		{ id: 'initiated', titleKey: 'refund_step_initiated', state: 'active' },
		{ id: 'bank', titleKey: 'refund_step_bank', state: 'pending' },
		{ id: 'credited', titleKey: 'refund_step_credited', state: 'pending', detail: expectedBy }
	];
}

export async function getRefund(refundId: string): Promise<ServiceResult<RefundRecord>> {
	await simulateLatency();

	const pnr = pnrFromRefundId(refundId);
	const bookingResult = await getBooking(pnr);
	if (bookingResult.status === 'error') {
		return { status: 'error', error: bookingResult.error };
	}

	const booking: Booking = bookingResult.data;
	const requestedAt = new Date();
	const expected = new Date(requestedAt.getTime() + 5 * 86_400_000);
	const expectedBy = new Date(expected.getTime() - expected.getTimezoneOffset() * 60_000)
		.toISOString()
		.slice(0, 10);

	return {
		status: 'ok',
		data: {
			refundId,
			pnr,
			breakdown: estimateRefund(booking.fare.total),
			requestedAt: requestedAt.toISOString(),
			expectedBy,
			steps: buildSteps(requestedAt, expectedBy)
		}
	};
}
