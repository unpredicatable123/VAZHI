import type { Paise } from '$types/common';
import type { RefundBreakdown } from '$types/booking';

/**
 * Refund arithmetic.
 *
 * Pure, and deliberately kept out of `refunds.service` so anything that needs
 * the numbers — the refund screen, the transaction ledger, a test — can have
 * them without pulling in Firestore. The service still owns fetching.
 *
 * The canonical worked example from the specification is 410 paid, an 82
 * cancellation fee, and 328 back. The fee is 20% of the total, which reproduces
 * that example exactly and still scales to a multi-seat booking.
 */

const CANCELLATION_FEE_RATE = 0.2;

export function estimateRefund(totalPaid: Paise): RefundBreakdown {
	const cancellationFee = Math.round(totalPaid * CANCELLATION_FEE_RATE);
	return {
		totalPaid,
		cancellationFee,
		estimatedRefund: totalPaid - cancellationFee
	};
}

/** `RF-5C0830` maps back to booking `VZ-5C0830`. */
export function pnrFromRefundId(refundId: string): string {
	return `VZ-${refundId.replace(/^RF-/, '')}`;
}
