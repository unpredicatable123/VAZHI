import { createHmac, timingSafeEqual } from 'node:crypto';
import Razorpay from 'razorpay';

/**
 * Razorpay order creation and signature verification.
 *
 * Kept out of `index.ts` so the two things that must never be got wrong — how
 * an amount is decided and how a signature is checked — sit in one small file
 * that can be read end to end.
 *
 * THE SECRET NEVER LEAVES THE SERVER. `RAZORPAY_KEY_SECRET` is bound to the
 * functions that need it through Firebase Secret Manager. It is used to sign
 * API calls and to recompute the checkout signature, and it is never returned
 * to a caller, never logged, and has no path into the browser bundle — the
 * client only ever sees the publishable key id.
 */

export interface RazorpayOrder {
	id: string;
	amount: number;
	currency: string;
	receipt?: string;
	status: string;
}

/**
 * Creates an order against Razorpay.
 *
 * The amount is in paise and is always computed by the caller from data the
 * server owns; nothing a browser sends reaches this function. Razorpay itself
 * rejects anything under 100 paise, and so do we, one step earlier, so the
 * failure is ours to explain rather than an opaque gateway error.
 */
export async function createOrder(
	keyId: string,
	keySecret: string,
	input: { amountPaise: number; receipt: string; notes?: Record<string, string> }
): Promise<RazorpayOrder> {
	if (!Number.isInteger(input.amountPaise) || input.amountPaise < 100) {
		throw new Error('amount_out_of_range');
	}

	const client = new Razorpay({ key_id: keyId, key_secret: keySecret });
	const order = await client.orders.create({
		amount: input.amountPaise,
		currency: 'INR',
		receipt: input.receipt.slice(0, 40),
		notes: input.notes,
		payment_capture: true
	});

	return {
		id: String(order.id),
		amount: Number(order.amount),
		currency: String(order.currency),
		receipt: order.receipt ? String(order.receipt) : undefined,
		status: String(order.status)
	};
}

/**
 * Checks the signature Razorpay Checkout hands back to the browser.
 *
 * Razorpay signs `order_id|payment_id` with the key secret. Recomputing it here
 * is the only thing that distinguishes a real payment from a browser simply
 * claiming one — a client can invent any pair of ids, but not a signature over
 * them.
 *
 * Compared with `timingSafeEqual`, so the comparison cannot leak how much of a
 * forged signature was correct. Length is checked first because
 * `timingSafeEqual` throws on a mismatch rather than returning false.
 */
export function verifySignature(
	keySecret: string,
	orderId: string,
	paymentId: string,
	signature: string
): boolean {
	if (!orderId || !paymentId || !signature) return false;

	const expected = createHmac('sha256', keySecret)
		.update(`${orderId}|${paymentId}`)
		.digest('hex');

	const given = Buffer.from(signature, 'utf8');
	const mine = Buffer.from(expected, 'utf8');
	if (given.length !== mine.length) return false;
	return timingSafeEqual(given, mine);
}

/**
 * Asks Razorpay how a payment was actually made.
 *
 * VAZHI no longer asks a traveller to pick a method up front — Razorpay's own
 * window offers UPI, cards, net banking and wallets, and choosing twice was
 * both redundant and a lie, since the earlier choice did not constrain the
 * window at all. So the method is read back from the gateway afterwards, which
 * is the only account of it that is actually true.
 *
 * Best effort by design: the caller treats `null` as "unknown" and carries on.
 * A booking that is paid for must never fail because a reporting lookup did.
 */
export async function fetchPaymentMethod(
	keyId: string,
	keySecret: string,
	paymentId: string
): Promise<string | null> {
	try {
		const client = new Razorpay({ key_id: keyId, key_secret: keySecret });
		const payment = await client.payments.fetch(paymentId);
		const method = typeof payment?.method === 'string' ? payment.method.trim() : '';
		return method === '' ? null : method;
	} catch {
		return null;
	}
}
