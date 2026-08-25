import { estimateRefund } from '$utils/refund-math';
import type { Paise } from '$types/common';
import type { Booking, LedgerEntry, LedgerTotals } from '$types/booking';

/**
 * Transaction ledger projection.
 *
 * DERIVED, NOT STORED. There is no transactions collection and nothing new is
 * written when a traveller pays or cancels. A booking document already records
 * what was paid, how, and when; cancelling it already records the refund. This
 * module projects those documents into a ledger, so the history can never drift
 * out of step with the bookings it describes — there is only one copy of the
 * truth.
 *
 * A booking becomes one payment line. A cancelled booking becomes a payment
 * line *and* a refund line against the same reference, the way a card statement
 * shows a charge and its later credit rather than quietly netting them off.
 *
 * Pure: no Firestore, no network. `transactions.service` does the fetching.
 *
 * PRIVACY: a ledger line carries the journey, the reference, and the money. The
 * passenger names on the booking are never copied onto it.
 */

/**
 * Firestore hands back a `Timestamp` for server-written fields, and an ISO
 * string for the ones the booking function wrote as text. Both reach here, so
 * both are accepted and one shape comes out.
 */
function isoFrom(value: unknown, fallback: string): string {
	if (typeof value === 'string' && value !== '') return value;
	const candidate = value as { toDate?: () => Date } | undefined;
	if (candidate && typeof candidate.toDate === 'function') {
		return candidate.toDate().toISOString();
	}
	return fallback;
}

/**
 * The refund a cancelled booking is owed.
 *
 * Uses the same estimator the refund screen shows, so the ledger and the refund
 * tracker can never quote a traveller two different numbers.
 */
function refundAmount(booking: Booking): Paise {
	return estimateRefund(booking.fare.total).estimatedRefund;
}

/** Both lines a single booking contributes, newest last. */
function linesFor(booking: Booking): LedgerEntry[] {
	const journey = {
		pnr: booking.pnr,
		serviceName: booking.serviceName,
		originName: booking.originName,
		destinationName: booking.destinationName,
		travelDate: booking.travelDate,
		seatIds: [...booking.seatIds]
	};

	const cancelled = booking.status === 'cancelled';

	const payment: LedgerEntry = {
		...journey,
		id: `${booking.pnr}-payment`,
		kind: 'payment',
		at: isoFrom(booking.bookedAt, new Date(0).toISOString()),
		amount: booking.fare.total,
		status: cancelled ? 'refund_pending' : 'paid',
		method: booking.paymentMethod
	};

	if (!cancelled) return [payment];

	const refund: LedgerEntry = {
		...journey,
		id: `${booking.pnr}-refund`,
		kind: 'refund',
		// A refund requested but not yet timestamped still belongs on the day the
		// booking was made rather than at the epoch, so ordering stays sensible.
		at: isoFrom(booking.refund?.requestedAt, payment.at),
		amount: refundAmount(booking),
		status: booking.refund?.status === 'completed' ? 'refunded' : 'refund_pending'
	};

	return [payment, refund];
}

/** Newest first, which is the order a statement is read in. */
export function buildLedger(bookings: Booking[]): LedgerEntry[] {
	return bookings
		.flatMap(linesFor)
		.sort((a, b) => (a.at === b.at ? a.id.localeCompare(b.id) : b.at.localeCompare(a.at)));
}

/**
 * Totals across the whole ledger.
 *
 * `net` is what a traveller has actually spent — money out less money coming
 * back — because that is the number someone opens a statement to find. A refund
 * still in progress counts toward it: it has been promised, and showing it only
 * once the bank confirms would overstate the spend for a week.
 */
export function ledgerTotals(entries: LedgerEntry[]): LedgerTotals {
	const paid = entries
		.filter((entry) => entry.kind === 'payment')
		.reduce((sum, entry) => sum + entry.amount, 0);
	const refunded = entries
		.filter((entry) => entry.kind === 'refund')
		.reduce((sum, entry) => sum + entry.amount, 0);

	return {
		paid,
		refunded,
		net: paid - refunded,
		bookings: entries.filter((entry) => entry.kind === 'payment').length
	};
}
