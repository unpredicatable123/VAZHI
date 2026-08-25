<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import BookingStepBar from '$components/booking/BookingStepBar.svelte';
	import SandboxNotice from '$components/booking/SandboxNotice.svelte';
	import BookingProgress from '$components/journey/BookingProgress.svelte';
	import Button from '$components/primitives/Button.svelte';
	import EmptyState from '$components/primitives/EmptyState.svelte';
	import ErrorState from '$components/primitives/ErrorState.svelte';
	import Icon from '$components/primitives/Icon.svelte';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import { calculateFare } from '$services/fare.service';
	import { payForBooking } from '$services/payment.service';
	import { bookingDraft } from '$stores/booking.svelte';
	import { bookings } from '$stores/bookings.svelte';
	import { passengers } from '$stores/passengers.svelte';
	import { journeySearch } from '$stores/search.svelte';
	import type { PaymentStatus } from '$types/booking';
	import type { Locale } from '$types/preferences';
	import { formatFare, placeName } from '$utils/format';
	import type { PageData } from './$types';

	/**
	 * Payment (specification section 10), through Razorpay Standard Checkout.
	 *
	 * The composition is unchanged — method list, fare summary, one primary
	 * action — but the button now opens Razorpay's own modal. No card, UPI, or
	 * bank value is ever entered into a VAZHI field or handled by this page; the
	 * traveller types it into the gateway's iframe.
	 *
	 * Three ways out of the modal, and each says something different: paid goes
	 * on to server verification, cancelled is not a failure and says so, and a
	 * decline explains itself. Only a verified payment reaches the confirmation
	 * screen, so this page never decides that a booking exists.
	 *
	 * On success the passenger store is cleared immediately — the details have
	 * served their purpose and nothing downstream needs them.
	 */

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	$effect(() => {
		journeySearch.hydrateFromParams(page.url.searchParams);
	});

	const locale = $derived(getLocale() as Locale);
	const searchParams = $derived(journeySearch.toParams().toString());
	const seats = $derived(bookingDraft.orderedSeats);

	let status = $state<PaymentStatus>('idle');
	/** Set when a payment fails, so the page shows the real reason. */
	let errorBody = $state<string>('');
	/** Closing the modal is not a failure, and is not reported as one. */
	let cancelled = $state(false);

	const fare = $derived(
		data.bus
			? calculateFare(data.bus, seats.length, passengers.concessionRequested)
			: calculateFare({ baseFare: 0, taxes: 0 }, 0)
	);

	const originStop = $derived(
		data.bus ? data.stops.find((stop) => stop.id === data.bus?.originStopId) : undefined
	);
	const destinationStop = $derived(
		data.bus ? data.stops.find((stop) => stop.id === data.bus?.destinationStopId) : undefined
	);

	const reviewHref = $derived(
		`/book/${data.busId}/review${searchParams ? `?${searchParams}` : ''}`
	);

	/**
	 * What the traveller sees in the Razorpay modal.
	 *
	 * Stop names rather than stop ids: this line is the only thing in the modal
	 * that says what is being paid for, and `salem-new` says nothing to anyone.
	 */
	const journeyLabel = $derived(
		originStop && destinationStop
			? `${placeName(originStop, locale)} → ${placeName(destinationStop, locale)}`
			: (data.bus?.serviceName ?? m.app_name())
	);

	async function pay() {
		if (!data.bus || seats.length === 0) return;
		status = 'processing';
		errorBody = '';
		cancelled = false;

		const result = await payForBooking({
			bus: data.bus,
			originStop,
			destinationStop,
			seatIds: seats,
			passengerCount: seats.length,
			travelDate: journeySearch.date,
			fare,
			journeyLabel,
			passengers: passengers.entries.map((entry, index) => ({
				seatId: seats[index],
				name: entry.fullName.trim(),
				...(entry.concession === 'none' ? {} : { concessionType: entry.concession })
			}))
		});

		if (result.status === 'cancelled') {
			// Not an error: the seats are still held and the button is live again.
			status = 'idle';
			cancelled = true;
			return;
		}

		if (result.status === 'error') {
			status = 'failed';
			errorBody = paymentErrorBody(result.messageKey);
			return;
		}

		status = 'succeeded';
		bookings.init();
		bookings.add(result.booking);

		// Personal data has served its purpose: wipe it before the confirmation
		// screen renders. Nothing beyond this point needs or shows it.
		passengers.clear();
		bookingDraft.reset();

		await goto(`/booking/${result.booking.pnr}`, { replaceState: true });
	}

	/** Message keys are resolved here rather than in the service, which stays UI-free. */
	function paymentErrorBody(key: string): string {
		switch (key) {
			case 'payment_error_gateway':
				return m.payment_error_gateway();
			case 'payment_error_declined':
				return m.payment_error_declined();
			case 'payment_error_unverified':
				return m.payment_error_unverified();
			default:
				return m.payment_error_body();
		}
	}
</script>

<svelte:head>
	<title>{m.payment_page_title()} — {m.app_name()}</title>
</svelte:head>

<BookingStepBar title={m.payment_page_title()} backHref={reviewHref} step={5} />

{#if !data.bus}
	<div class="shell-width w-full px-4 py-10 md:px-6">
		<EmptyState
			title={m.booking_bus_missing_title()}
			body={m.booking_bus_missing_body()}
			icon="bus"
			action={exploreAction}
		/>
	</div>
{:else if seats.length === 0}
	<div class="shell-width w-full px-4 py-10 md:px-6">
		<EmptyState
			title={m.booking_no_seats_title()}
			body={m.booking_no_seats_body()}
			icon="seat"
			action={seatsAction}
		/>
	</div>
{:else}
	<div class="shell-width flex w-full flex-col items-center gap-6 px-4 py-6 md:px-6 md:py-10">
		<div class="w-full max-w-lg">
			<BookingProgress current={5} variant="full" />
		</div>

		<!-- Stitch centres a single payment card; the composition is kept. -->
		<div
			class="flex w-full max-w-lg flex-col gap-6 rounded-card border border-border bg-surface
				p-4 shadow-level-2 md:p-8"
		>
			<div class="flex flex-col items-center gap-2 text-center">
				<h2 class="text-headline-sm text-text md:text-headline">{m.payment_heading()}</h2>
				<p class="text-body-sm text-text-muted">{m.payment_subtitle()}</p>
			</div>

			<SandboxNotice title={m.payment_sandbox_title()} body={m.payment_sandbox_body()} />

			<div
				class="flex items-center justify-between gap-4 rounded-[8px] border border-border
					bg-surface-container p-4"
			>
				<div>
					<span class="block text-title text-text">{m.payment_total_label()}</span>
					<span class="text-mono-data block text-body-sm text-text-muted">
						{m.payment_seats_label()}: {seats.join(', ')}
					</span>
				</div>
				<span class="text-mono-data text-headline-sm font-bold text-primary-soft-text">
					{formatFare(fare.total, locale)}
				</span>
			</div>

			<!--
				No method picker. Razorpay's window offers UPI, cards, net banking and
				wallets, so choosing here first constrained nothing — it only added a
				step and implied a choice VAZHI was not actually making. Which method
				was used is read back from the gateway afterwards and shown on the
				transaction history, where it is a fact rather than a guess.
			-->
			<p class="flex items-start gap-2 text-body-sm text-text-muted">
				<span class="mt-0.5 shrink-0 text-primary-soft-text"><Icon name="payments" size={16} /></span>
				{m.payment_methods_note()}
			</p>

			{#if cancelled}
				<SandboxNotice
					title={m.payment_cancelled_title()}
					body={m.payment_cancelled_body()}
				/>
			{/if}

			{#if status === 'failed'}
				<ErrorState title={m.payment_error_title()} body={errorBody} onRetry={pay} />
			{/if}

			<div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-text-muted">
				<span class="flex items-center gap-1.5 text-caps uppercase">
					<Icon name="shield" size={16} />
					{m.payment_trust_secure()}
				</span>
				<span class="flex items-center gap-1.5 text-caps uppercase">
					<Icon name="info" size={16} />
					{m.payment_trust_verified()}
				</span>
			</div>

			<div class="flex flex-col gap-2">
				<Button
					size="lg"
					fullWidth
					iconLeft="shield"
					loading={status === 'processing'}
					onclick={pay}
				>
					{m.payment_pay_now({ amount: formatFare(fare.total, locale) })}
				</Button>
				<Button href={reviewHref} variant="ghost" fullWidth>{m.payment_cancel()}</Button>
				<p class="text-center text-body-sm text-text-faint">{m.payment_powered_by()}</p>
			</div>

			<p class="sr-only" aria-live="polite">
				{status === 'processing' ? m.payment_processing() : ''}
			</p>
		</div>
	</div>
{/if}

{#snippet exploreAction()}
	<Button href="/explore" variant="secondary" iconLeft="explore">
		{m.booking_back_to_explore()}
	</Button>
{/snippet}

{#snippet seatsAction()}
	<Button
		href={`/book/${data.busId}/seats${searchParams ? `?${searchParams}` : ''}`}
		variant="secondary"
		iconLeft="seat"
	>
		{m.booking_go_to_seats()}
	</Button>
{/snippet}
