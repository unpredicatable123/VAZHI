import { canonicalBooking } from '$lib/mocks/bookings.mock';
import { estimateRefund, pnrFromRefundId } from '$utils/refund-math';
import { simulateLatency } from './transport';
import { getBooking } from './bookings.service';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '$lib/firebase/client';
/**
 * Refund and cancellation operations.
 */
export const localApprovalOverrides = {};
export const localRejectionReasons = {};
function buildSteps(booking, expectedBy) {
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
export async function getRefund(refundId) {
    await simulateLatency();
    const pnr = pnrFromRefundId(refundId);
    const bookingResult = await getBooking(pnr);
    if (bookingResult.status === 'error') {
        return { status: 'error', error: bookingResult.error };
    }
    const booking = bookingResult.data;
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
export async function listOperationsRefunds() {
    try {
        const { db } = requireFirebase();
        const snapshot = await getDocs(query(collection(db, 'bookings'), where('status', 'in', ['cancellation_pending', 'cancelled'])));
        const rawBookings = snapshot.docs.map((doc) => doc.data());
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
                    };
                }
                return b;
            });
            return { status: 'ok', data: bookings };
        }
    }
    catch {
        // Ignore and fallback below
    }
    const demoOverride = localApprovalOverrides['VZ-5C0830'];
    const demoPending = {
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
export async function approveOperationsRefund(pnr) {
    try {
        const { functions, db } = requireFirebase();
        try {
            const result = await httpsCallable(functions, 'approveRefund')({ pnr });
            localApprovalOverrides[pnr] = 'approved';
            return { status: 'ok', data: result.data };
        }
        catch {
            try {
                await updateDoc(doc(db, 'bookings', pnr), {
                    status: 'cancelled',
                    'refund.status': 'approved',
                    'refund.approvedAt': new Date().toISOString()
                });
            }
            catch {
                // Ignore Firestore write error in local/demo mode
            }
            localApprovalOverrides[pnr] = 'approved';
            return { status: 'ok', data: { pnr } };
        }
    }
    catch {
        localApprovalOverrides[pnr] = 'approved';
        return { status: 'ok', data: { pnr } };
    }
}
export async function rejectOperationsRefund(pnr, reason) {
    try {
        const { functions, db } = requireFirebase();
        try {
            const result = await httpsCallable(functions, 'rejectRefund')({ pnr, reason });
            localApprovalOverrides[pnr] = 'rejected';
            if (reason)
                localRejectionReasons[pnr] = reason;
            return { status: 'ok', data: result.data };
        }
        catch {
            try {
                await updateDoc(doc(db, 'bookings', pnr), {
                    status: 'confirmed',
                    'refund.status': 'rejected',
                    'refund.rejectedAt': new Date().toISOString(),
                    'refund.rejectionReason': reason ?? 'Rejected by Operations'
                });
            }
            catch {
                // Ignore Firestore write error in local/demo mode
            }
            localApprovalOverrides[pnr] = 'rejected';
            if (reason)
                localRejectionReasons[pnr] = reason;
            return { status: 'ok', data: { pnr } };
        }
    }
    catch {
        localApprovalOverrides[pnr] = 'rejected';
        if (reason)
            localRejectionReasons[pnr] = reason;
        return { status: 'ok', data: { pnr } };
    }
}
