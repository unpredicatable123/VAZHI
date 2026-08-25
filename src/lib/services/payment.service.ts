import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '$lib/firebase/client';
import { mapFirebaseError } from '$lib/firebase/errors';
import { loadCheckout, openCheckout } from './razorpay';
import type {
	Booking,
	ConcessionCategory,
	FareBreakdown,
	SeatId
} from '$types/booking';
import type { BusResult, TransitStop } from '$types/transit';

/**
 * Payment, through Razorpay Standard Checkout.
 *
 * THE SHAPE OF THE FLOW. Hold the seats, ask the server to open an order, let
 * the traveller pay in Razorpay's modal, then send the three values Checkout
 * returns back to the server to be verified. The booking is created by that
 * verification and by nothing else.
 *
 * Which means: this file cannot mark anything paid. It has no key secret, it
 * does not choose the amount — `createPaymentOrder` reads that from the trip
 * document — and if the signature does not verify, `verifyPayment` refuses and
 * no ticket exists. A tampered client can reach the modal and no further.
 *
 * Test mode. The credentials in use are Razorpay test keys, so real cards are
 * declined and no money moves; the calls to Razorpay themselves are real.
 */

interface BookingPassengerInput {
	seatId: SeatId;
	name: string;
	concessionType?: Exclude<ConcessionCategory, 'none'>;
}

export interface PaymentRequest {
	bus: BusResult;
	originStop?: TransitStop;
	destinationStop?: TransitStop;
	seatIds: SeatId[];
	passengerCount: number;
	travelDate: string;
	fare: FareBreakdown;
	passengers: BookingPassengerInput[];
	/** Shown in the modal so the traveller recognises what they are paying for. */
	journeyLabel: string;
}

interface HoldResponse {
	holdId: string;
	tripId: string;
	seatIds: SeatId[];
	expiresAt: string;
}

interface OrderResponse {
	order_id: string;
	amount: number;
	currency: string;
}

/**
 * How a payment attempt ended.
 *
 * `cancelled` is deliberately not an error: closing the modal is an ordinary
 * decision, and the page says so rather than showing a failure.
 */
export type PaymentOutcome =
	| { status: 'ok'; booking: Booking }
	| { status: 'cancelled' }
	| { status: 'error'; messageKey: string };

/** Every failure the page can show, mapped to a message key it already has. */
function failure(messageKey: string): PaymentOutcome {
	return { status: 'error', messageKey };
}

export async function payForBooking(request: PaymentRequest): Promise<PaymentOutcome> {
	if (
		request.seatIds.length === 0 ||
		request.passengerCount !== request.seatIds.length ||
		request.passengers.length !== request.seatIds.length
	) {
		return failure('payment_error_body');
	}

	const sdk = requireFirebase();

	/* ---- 1. hold the seats, so nobody else can take them mid-payment ---- */
	let hold: HoldResponse;
	try {
		const held = await httpsCallable<{ tripId: string; seatIds: SeatId[] }, HoldResponse>(
			sdk.functions,
			'holdSeats'
		)({ tripId: request.bus.tripId, seatIds: request.seatIds });
		hold = held.data;
	} catch (error) {
		return failure(mapFirebaseError(error, 'payment_error_body').messageKey);
	}

	/* ---- 2. the server opens an order for the fare it computes itself ---- */
	let order: OrderResponse;
	try {
		const opened = await httpsCallable<
			{ tripId: string; holdId: string; seatIds: SeatId[] },
			OrderResponse
		>(sdk.functions, 'createPaymentOrder')({
			tripId: request.bus.tripId,
			holdId: hold.holdId,
			seatIds: request.seatIds
		});
		order = opened.data;
	} catch (error) {
		return failure(mapFirebaseError(error, 'payment_error_body').messageKey);
	}

	/* ---- 3. the traveller pays in Razorpay's own modal ---- */
	try {
		await loadCheckout();
	} catch {
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

	if (outcome.status === 'dismissed') return { status: 'cancelled' };
	if (outcome.status === 'failed') return failure('payment_error_declined');

	/* ---- 4. only the server can turn that into a ticket ---- */
	try {
		const confirmed = await httpsCallable<
			{
				razorpay_order_id: string;
				razorpay_payment_id: string;
				razorpay_signature: string;
				tripId: string;
				holdId: string;
				seatIds: SeatId[];
				passengers: BookingPassengerInput[];
			},
			{ booking: Booking }
		>(
			sdk.functions,
			'verifyPayment'
		)({
			...outcome.response,
			tripId: request.bus.tripId,
			holdId: hold.holdId,
			seatIds: request.seatIds,
			passengers: request.passengers
		});
		return { status: 'ok', booking: confirmed.data.booking };
	} catch (error) {
		// Money may well have been taken here, so this must never look like an
		// ordinary decline: the payment id is the traveller's evidence.
		const mapped = mapFirebaseError(error, 'payment_error_unverified');
		return failure(
			mapped.code === 'permission_denied' ? 'payment_error_unverified' : mapped.messageKey
		);
	}
}
