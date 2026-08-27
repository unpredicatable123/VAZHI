import { createHmac, timingSafeEqual } from 'node:crypto';
import Razorpay from 'razorpay';

/** Razorpay's SDK normalises HTTP errors into `{ statusCode, error }`. */
export function isRateLimitError(error) {
    return Number(error?.statusCode) === 429;
}
/**
 * Creates an order against Razorpay.
 *
 * The amount is in paise and is always computed by the caller from data the
 * server owns; nothing a browser sends reaches this function. Razorpay itself
 * rejects anything under 100 paise, and so do we, one step earlier, so the
 * failure is ours to explain rather than an opaque gateway error.
 */
export async function createOrder(keyId, keySecret, input) {
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
export function verifySignature(keySecret, orderId, paymentId, signature) {
    if (!orderId || !paymentId || !signature)
        return false;
    const expected = createHmac('sha256', keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
    const given = Buffer.from(signature, 'utf8');
    const mine = Buffer.from(expected, 'utf8');
    if (given.length !== mine.length)
        return false;
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
export async function fetchPaymentMethod(keyId, keySecret, paymentId) {
    try {
        const client = new Razorpay({ key_id: keyId, key_secret: keySecret });
        const payment = await client.payments.fetch(paymentId);
        const method = typeof payment?.method === 'string' ? payment.method.trim() : '';
        return method === '' ? null : method;
    }
    catch {
        return null;
    }
}
