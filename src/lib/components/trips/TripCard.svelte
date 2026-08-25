<script lang="ts">
	import Badge from '$components/primitives/Badge.svelte';
	import Button from '$components/primitives/Button.svelte';
	import Icon from '$components/primitives/Icon.svelte';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import type { Booking } from '$types/booking';
	import type { Locale } from '$types/preferences';
	import { formatClock, formatFare, formatJourneyDate } from '$utils/format';

	/**
	 * A journey in My Trips.
	 *
	 * Shows route, date, reference, seats, and fare. No passenger identity is
	 * present — `Booking` has no field for one.
	 */

	interface Props {
		booking: Booking;
		/** Fires for a confirmed booking the traveller wants to cancel. */
		oncancel?: (pnr: string) => void;
		cancelling?: boolean;
	}

	let { booking, oncancel, cancelling = false }: Props = $props();

	const locale = $derived(getLocale() as Locale);

	const statusTone = $derived(
		booking.status === 'confirmed'
			? ('primary' as const)
			: booking.status === 'completed'
				? ('success' as const)
				: ('danger' as const)
	);

	const statusLabel = $derived(
		{
			confirmed: m.trips_status_confirmed(),
			completed: m.trips_status_completed(),
			cancelled: m.trips_status_cancelled()
		}[booking.status]
	);

	const refundId = $derived(`RF-${booking.pnr.replace(/^VZ-/, '')}`);
</script>

<article
	class="flex w-full flex-col rounded-card border bg-surface p-4 shadow-level-1 transition-colors
		{booking.status === 'confirmed' ? 'border-primary' : 'border-border hover:border-primary'}"
	aria-label={`${booking.originName} ${booking.destinationName} ${booking.pnr}`}
>
	<div class="flex items-start justify-between gap-3">
		<span class="flex items-center gap-2">
			<span class="text-primary-soft-text"><Icon name="bus" size={20} /></span>
			<span class="rounded-[6px] bg-surface-container px-2 py-1 text-caps text-text-muted">
				{formatJourneyDate(booking.travelDate, locale)}
			</span>
		</span>
		<Badge tone={statusTone} shape="pill">{statusLabel}</Badge>
	</div>

	<!-- Stop names wrap rather than truncate: a narrow card must never hide
	     which journey this is. -->
	<div class="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
		<span class="text-body font-semibold text-text">{booking.originName}</span>
		<Icon name="arrow-right" size={16} class="shrink-0 text-primary-soft-text" />
		<span class="text-body font-semibold text-text">{booking.destinationName}</span>
	</div>

	<p class="text-mono-data mt-1 text-body-sm text-text-muted">
		{formatClock(booking.departure)} → {formatClock(booking.arrival)} · {booking.serviceName}
	</p>
	<p class="text-mono-data text-body-sm text-text-muted">{booking.vehicleNumber}</p>

	<div class="mt-3 flex flex-wrap items-end justify-between gap-3">
		<div>
			<p class="text-body-sm text-text-muted">{m.trips_pnr_label()}</p>
			<p
				class="text-mono-data mt-0.5 inline-block rounded-[6px] bg-surface-container px-2 py-1
					text-text"
			>
				{booking.pnr}
			</p>
		</div>
		<div class="text-right">
			<p class="text-caps uppercase text-text-muted">{m.confirmation_seats()}</p>
			<p class="text-mono-data text-text">{booking.seatIds.join(', ')}</p>
		</div>
		<div class="text-right">
			<p class="text-caps uppercase text-text-muted">{m.fare_total()}</p>
			<p class="text-mono-data font-semibold text-text">
				{formatFare(booking.fare.total, locale)}
			</p>
		</div>
	</div>

	<div class="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
		{#if booking.status === 'cancelled'}
			<Button href={`/refund/${refundId}`} variant="secondary" iconLeft="payments">
				{m.trips_view_refund()}
			</Button>
		{:else}
			<Button href={`/ticket/${booking.pnr}`} variant="secondary" iconLeft="ticket">
				{m.trips_view_ticket()}
			</Button>
		{/if}

		{#if booking.status === 'confirmed'}
			<Button href={`/trips/${booking.pnr}/track`} iconLeft="pin">{m.trips_track()}</Button>
			{#if oncancel}
				<Button
					variant="ghost"
					loading={cancelling}
					onclick={() => oncancel?.(booking.pnr)}
					class="text-danger"
				>
					{m.trips_cancel()}
				</Button>
			{/if}
		{/if}
	</div>
</article>
