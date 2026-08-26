import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '$lib/firebase/client';
import { mapFirebaseError } from '$lib/firebase/errors';
import { loadCheckout, openCheckout } from './razorpay';
/** Every failure the page can show, mapped to a message key it already has. */
function failure(messageKey) {
    return { status: 'error', messageKey };
}
export async function payForBooking(request) {
    if (request.seatIds.length === 0 ||
        request.passengerCount !== request.seatIds.length ||
        request.passengers.length !== request.seatIds.length) {
        return failure('payment_error_body');
    }
    const sdk = requireFirebase();
    /* ---- 1. hold the seats, so nobody else can take them mid-payment ---- */
    let hold;
    try {
        const held = await httpsCallable(sdk.functions, 'holdSeats')({ tripId: request.bus.tripId, seatIds: request.seatIds });
        hold = held.data;
    }
    catch (error) {
        return failure(mapFirebaseError(error, 'payment_error_body').messageKey);
    }
    /* ---- 2. the server opens an order for the fare it computes itself ---- */
    let order;
    try {
        const opened = await httpsCallable(sdk.functions, 'createPaymentOrder')({
            tripId: request.bus.tripId,
            holdId: hold.holdId,
            seatIds: request.seatIds
        });
        order = opened.data;
    }
    catch (error) {
        return failure(mapFirebaseError(error, 'payment_error_body').messageKey);
    }
    /* ---- 3. the traveller pays in Razorpay's own modal ---- */
    try {
        await loadCheckout();
    }
    catch {
        return failure('payment_error_gateway');
    }
    const outcome = await openCheckout({
        orderId: order.order_id,
        amount: order.amount,
        currency: order.currency,
        name: 'VAZHI',
        description: request.journeyLabel,
        prefill: {
            name: request.passengers[0]?.name,
            email: sdk.auth.currentUser?.email ?? undefined
        },
        notes: { seats: request.seatIds.join(', ') }
    });
    if (outcome.status === 'dismissed')
        return { status: 'cancelled' };
    if (outcome.status === 'failed')
        return failure('payment_error_declined');
    /* ---- 4. only the server can turn that into a ticket ---- */
    try {
        const confirmed = await httpsCallable(sdk.functions, 'verifyPayment')({
            ...outcome.response,
            tripId: request.bus.tripId,
            holdId: hold.holdId,
            seatIds: request.seatIds,
            passengers: request.passengers
        });
        return { status: 'ok', booking: confirmed.data.booking };
    }
    catch (error) {
        // Money may well have been taken here, so this must never look like an
        // ordinary decline: the payment id is the traveller's evidence.
        const mapped = mapFirebaseError(error, 'payment_error_unverified');
        return failure(mapped.code === 'permission_denied' ? 'payment_error_unverified' : mapped.messageKey);
    }
}
