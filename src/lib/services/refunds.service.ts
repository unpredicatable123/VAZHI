import { canonicalBooking } from '$lib/mocks/bookings.mock';
import type { Booking, Pnr, RefundRecord, RefundStep } from '$types/booking';
import type { ServiceResult } from '$types/common';
import { estimateRefund, pnrFromRefundId } from '$utils/refund-math';
import { simulateLatency } from './transport';
import { getBooking } from './bookings.service';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '$lib/firebase/client';

/**
 * Refund and cancellation operations.
 */

export const localApprovalOverrides: Record<string, 'approved' | 'rejected'> = {};
export const localRejectionReasons: Record<string, string> = {};

function buildSteps(booking: Booking, expectedBy: string): RefundStep[] {
	const refundStatus = booking.refund?.status;

	if (refundStatus === 'pending_approval') {
		return [
			{ id: 'requested', titleKey: 'refund_step_requested', state: 'done' },
			{ id: 'ops_approval', titleKey: 'refund_step_ops_pending', state: 'active', detail: 'Awaiting Operations Approval' },
			{ id: 'initiated', titleKey: 'refund_step_initiated', state: 'pending' },
			{ id: 'bank', titleKey: 'refund_step_bank', state: 'pending' },
			{ id: 'credited', titleKey: 'refund_step_credited', state: 'pending', detail: expectedBy }
		];
	}

	if (refundStatus === 'rejected') {
		return [
			{ id: 'requested', titleKey: 'refund_step_requested', state: 'done' },
			{
				id: 'ops_approval',
				titleKey: 'refund_step_ops_rejected',
				state: 'done',
				detail: booking.refund?.rejectionReason ? `Reason: ${booking.refund.rejectionReason}` : 'Rejected by Operations'
			}
		];
	}

	// Approved or simulated pending
	return [
		{ id: 'requested', titleKey: 'refund_step_requested', state: 'done' },
		{ id: 'ops_approval', titleKey: 'refund_step_ops_approved', state: 'done', detail: 'Approved by Operations' },
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
	const requestedAt = booking.refund?.requestedAt ? new Date(booking.refund.requestedAt) : new Date();
	const expected = new Date(requestedAt.getTime() + 5 * 86_400_000);
	const expectedBy = new Date(expected.getTime() - expected.getTimezoneOffset() * 60_000)
		.toISOString()
		.slice(0, 10);

	const totalFare = booking.fare?.total ?? 41000;
	return {
		status: 'ok',
		data: {
			refundId,
			pnr,
			breakdown: booking.refund?.breakdown ?? estimateRefund(totalFare),
			requestedAt: requestedAt.toISOString(),
			expectedBy,
			steps: buildSteps(booking, expectedBy)
		}
	};
}

export async function listOperationsRefunds(): Promise<ServiceResult<Booking[]>> {
	try {
		const { db } = requireFirebase();
		const snapshot = await getDocs(
			query(
				collection(db, 'bookings'),
				where('status', 'in', ['cancellation_pending', 'cancelled'])
			)
		);
		const rawBookings = snapshot.docs.map((doc) => doc.data() as Booking);
		if (rawBookings.length > 0) {
			const bookings = rawBookings.map((b) => {
				const override = localApprovalOverrides[b.pnr];
				if (override) {
					return {
						...b,
						status: override === 'approved' ? 'cancelled' : 'confirmed',
						refund: {
							...b.refund,
							status: override,
							rejectionReason: localRejectionReasons[b.pnr] ?? b.refund?.rejectionReason
						}
					} as Booking;
				}
				return b;
			});
			return { status: 'ok', data: bookings };
		}
	} catch {
		// Ignore and fallback below
	}

	const demoOverride = localApprovalOverrides['VZ-5C0830'];
	const demoPending: Booking = {
		...canonicalBooking(),
		pnr: 'VZ-5C0830',
		status: demoOverride === 'approved' ? 'cancelled' : 'cancellation_pending',
		refund: {
			status: demoOverride ?? 'pending_approval',
			requestedAt: new Date().toISOString(),
			hoursBeforeDeparture: 5,
			breakdown: estimateRefund(canonicalBooking().fare.total),
			rejectionReason: localRejectionReasons['VZ-5C0830']
		}
	};
	return { status: 'ok', data: [demoPending] };
}

export async function approveOperationsRefund(pnr: Pnr): Promise<ServiceResult<{ pnr: string }>> {
	try {
		const { functions, db } = requireFirebase();
		try {
			const result = await httpsCallable<{ pnr: string }, { pnr: string }>(functions, 'approveRefund')({ pnr });
			localApprovalOverrides[pnr] = 'approved';
			return { status: 'ok', data: result.data };
		} catch {
			try {
				await updateDoc(doc(db, 'bookings', pnr), {
					status: 'cancelled',
					'refund.status': 'approved',
					'refund.approvedAt': new Date().toISOString()
				});
			} catch {
				// Ignore Firestore write error in local/demo mode
			}
			localApprovalOverrides[pnr] = 'approved';
			return { status: 'ok', data: { pnr } };
		}
	} catch {
		localApprovalOverrides[pnr] = 'approved';
		return { status: 'ok', data: { pnr } };
	}
}

export async function rejectOperationsRefund(pnr: Pnr, reason?: string): Promise<ServiceResult<{ pnr: string }>> {
	try {
		const { functions, db } = requireFirebase();
		try {
			const result = await httpsCallable<{ pnr: string; reason?: string }, { pnr: string }>(functions, 'rejectRefund')({ pnr, reason });
			localApprovalOverrides[pnr] = 'rejected';
			if (reason) localRejectionReasons[pnr] = reason;
			return { status: 'ok', data: result.data };
		} catch {
			try {
				await updateDoc(doc(db, 'bookings', pnr), {
					status: 'confirmed',
					'refund.status': 'rejected',
					'refund.rejectedAt': new Date().toISOString(),
					'refund.rejectionReason': reason ?? 'Rejected by Operations'
				});
			} catch {
				// Ignore Firestore write error in local/demo mode
			}
			localApprovalOverrides[pnr] = 'rejected';
			if (reason) localRejectionReasons[pnr] = reason;
			return { status: 'ok', data: { pnr } };
		}
	} catch {
		localApprovalOverrides[pnr] = 'rejected';
		if (reason) localRejectionReasons[pnr] = reason;
		return { status: 'ok', data: { pnr } };
	}
}
