/**
 * Razorpay Standard Checkout, client side.
 *
 * WHAT THIS FILE MAY KNOW. The publishable key id, the order id the server
 * opened, and the three values Checkout hands back on success. It never sees
 * the key secret, never decides an amount, and never marks anything paid — the
 * amount is computed by `createPaymentOrder` from the trip document, and only
 * `verifyPayment` can turn a completed checkout into a ticket.
 *
 * PRIVACY. Prefill is deliberately thin: the lead passenger's name and the
 * account's own email address, both of which the traveller is about to type
 * into the gateway anyway. No phone number is sent because VAZHI does not
 * collect one, and nothing else about the journey or the other passengers
 * reaches Razorpay beyond the trip id and seat list already in the order notes.
 */

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

/** The subset of Razorpay's Checkout API this integration relies on. */
interface RazorpayHandlerResponse {
	razorpay_payment_id: string;
	razorpay_order_id: string;
	razorpay_signature: string;
}

interface RazorpayOptions {
	key: string;
	order_id: string;
	amount: number;
	currency: string;
	name: string;
	description?: string;
	theme?: { color?: string };
	prefill?: { name?: string; email?: string };
	notes?: Record<string, string>;
	handler: (response: RazorpayHandlerResponse) => void;
	modal?: { ondismiss?: () => void; escape?: boolean };
}

interface RazorpayInstance {
	open(): void;
	on(event: 'payment.failed', handler: (payload: { error?: { description?: string } }) => void): void;
}

declare global {
	interface Window {
		Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
	}
}

let loader: Promise<void> | null = null;

/**
 * Loads Checkout once per page.
 *
 * Razorpay publishes no npm package for Standard Checkout — the modal must come
 * from their CDN so it stays current with the gateway. The promise is cached so
 * a traveller returning to the payment step does not add a second script tag,
 * and a failed load is not cached, so a retry can succeed on a flaky
 * connection.
 */
export function loadCheckout(): Promise<void> {
	if (typeof window === 'undefined') return Promise.reject(new Error('razorpay/no-window'));
	if (window.Razorpay) return Promise.resolve();
	if (loader) return loader;

	loader = new Promise<void>((resolve, reject) => {
		const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);
		const script = existing ?? document.createElement('script');
		script.src = CHECKOUT_SRC;
		script.async = true;
		script.addEventListener('load', () => resolve(), { once: true });
		script.addEventListener(
			'error',
			() => {
				loader = null;
				reject(new Error('razorpay/script-failed'));
			},
			{ once: true }
		);
		if (!existing) document.head.appendChild(script);
	});

	return loader;
}

/** What the modal did. Distinct outcomes so the page can say the right thing. */
export type CheckoutOutcome =
	| { status: 'paid'; response: RazorpayHandlerResponse }
	| { status: 'dismissed' }
	| { status: 'failed'; reason?: string };

export interface CheckoutRequest {
	orderId: string;
	amount: number;
	currency: string;
	/** Shown as the merchant name in the modal. */
	name: string;
	description: string;
	prefill?: { name?: string; email?: string };
	notes?: Record<string, string>;
}

/**
 * Opens the modal and resolves once the traveller is finished with it.
 *
 * Every exit resolves rather than rejecting, because "I closed the window" is
 * an ordinary thing to do and not an error — the caller decides what each
 * outcome means. `settle` guards against Razorpay firing both a failure and a
 * dismiss for one attempt, which would otherwise resolve the promise twice and
 * leave the page in the wrong state.
 */
export function openCheckout(request: CheckoutRequest): Promise<CheckoutOutcome> {
	const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID?.trim();
	if (!keyId) return Promise.resolve({ status: 'failed', reason: 'razorpay/not-configured' });

	// Captured here rather than read inside the promise: the guard below narrows
	// this local, where a property read would widen again on every access.
	const Checkout = window.Razorpay;
	if (!Checkout) return Promise.resolve({ status: 'failed', reason: 'razorpay/script-failed' });

	return new Promise<CheckoutOutcome>((resolve) => {
		let done = false;
		const settle = (outcome: CheckoutOutcome) => {
			if (done) return;
			done = true;
			resolve(outcome);
		};

		const checkout = new Checkout({
			key: keyId,
			order_id: request.orderId,
			amount: request.amount,
			currency: request.currency,
			name: request.name,
			description: request.description,
			// VAZHI's primary green, so the modal does not arrive as a different product.
			theme: { color: '#4a7c59' },
			prefill: request.prefill,
			notes: request.notes,
			handler: (response) => settle({ status: 'paid', response }),
			modal: { ondismiss: () => settle({ status: 'dismissed' }) }
		});

		checkout.on('payment.failed', (payload) =>
			settle({ status: 'failed', reason: payload?.error?.description })
		);

		checkout.open();
	});
}
