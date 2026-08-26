<script>
import Badge from '$components/primitives/Badge.svelte';
import Button from '$components/primitives/Button.svelte';
import Icon from '$components/primitives/Icon.svelte';
import * as m from '$lib/paraglide/messages';
import { getLocale } from '$lib/paraglide/runtime';
import { isBookable } from '$services/buses.service';
import { totalFare } from '$services/search.service';
import { formatClock, formatDuration, formatFare, placeName } from '$utils/format';
let { bus, originStop, destinationStop, searchParams = '' } = $props();
const locale = $derived(getLocale());
const fare = $derived(formatFare(totalFare(bus)));
const layoutLabel = $derived(`${bus.amenities.airConditioned ? m.bus_ac() : m.bus_non_ac()} • ${bus.amenities.seatLayout}`);
const seatsHref = $derived(`/book/${bus.id}/seats${searchParams ? `?${searchParams}` : ''}`);
const bookable = $derived(isBookable(bus));
</script>

<article
	class="group flex flex-col gap-4 rounded-card border border-border bg-surface p-4
		shadow-level-1 transition-colors hover:border-primary"
	aria-label={m.bus_details_label({
		operator: bus.serviceName,
		departure: bus.departure,
		arrival: bus.arrival,
		fare
	})}
>
	<div class="flex items-start justify-between gap-3">
		<div class="flex items-start gap-3">
			<span
				class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px]
					bg-primary-soft text-primary-soft-text"
			>
				<Icon name="bus" size={22} />
			</span>
			<div class="min-w-0">
				<h3 class="text-title text-text">{bus.serviceName}</h3>
				<p class="mt-0.5 flex flex-wrap items-center gap-1.5 text-body-sm text-text-muted">
					<span>{layoutLabel}</span>
					<span aria-hidden="true">•</span>
					<span
						class="text-mono-data rounded-[4px] bg-surface-container px-1.5 py-0.5 text-[13px]
							text-text"
					>
						<span class="sr-only">{m.bus_vehicle_number()}: </span>{bus.vehicleNumber}
					</span>
				</p>
			</div>
		</div>

		{#if bus.highlights.includes('fast')}
			<Badge tone="primary" shape="pill" icon="bolt" class="shrink-0">{m.bus_tag_fast()}</Badge>
		{/if}
	</div>

	<div class="flex items-center justify-between gap-2 border-y border-border py-3">
		<div class="flex min-w-0 flex-col">
			<span class="text-mono-data text-[18px] leading-6 font-semibold text-text">
				<span class="sr-only">{m.bus_departure_time()}: </span>{formatClock(bus.departure)}
			</span>
			<span class="truncate text-caps text-text-muted">
				{originStop ? placeName(originStop, locale) : bus.originStopId}
			</span>
		</div>

		<div class="relative flex flex-1 items-center justify-center px-2">
			<span class="h-px w-full border-b border-dashed border-border-strong" aria-hidden="true"
			></span>
			<span
				class="text-mono-data absolute bg-surface px-2 text-[12px] text-text-faint"
			>
				<span class="sr-only">{m.bus_duration()}: </span>{formatDuration(bus.durationMinutes)}
			</span>
		</div>

		<div class="flex min-w-0 flex-col text-right">
			<span class="text-mono-data text-[18px] leading-6 font-semibold text-text">
				<span class="sr-only">{m.bus_arrival_time()}: </span>{formatClock(bus.arrival)}
			</span>
			<span class="truncate text-caps text-text-muted">
				{destinationStop ? placeName(destinationStop, locale) : bus.destinationStopId}
			</span>
		</div>
	</div>

	<div class="flex flex-wrap gap-2">
		{#if bus.accessibleBoardingPoint}
			<Badge tone="accent" icon="accessible">{m.bus_accessible_boarding()}</Badge>
		{/if}
		<Badge tone="neutral" icon="seat">
			{bus.seatsAvailable === 1
				? m.bus_seats_left_one()
				: m.bus_seats_left({ count: bus.seatsAvailable })}
		</Badge>
		{#if bus.amenities.airConditioned}
			<Badge tone="neutral" icon="snowflake">{m.bus_ac()}</Badge>
		{/if}
		<Badge tone="neutral" icon="pin">{m.bus_platform({ platform: bus.boardingPlatform })}</Badge>
	</div>

	<div class="flex flex-wrap items-end justify-between gap-3">
		<div class="flex flex-col">
			<span class="text-caps uppercase text-text-muted">{m.bus_fare_from()}</span>
			<span class="text-mono-data text-title font-bold text-text">{fare}</span>
			<span class="text-body-sm text-text-faint">{m.bus_fare_per_passenger()}</span>
		</div>

		{#if bookable}
			<Button href={seatsHref} size="md">{m.bus_select_seats()}</Button>
		{:else}
			<!-- Reached only when a service has genuinely sold out. -->
			<Badge tone="neutral" icon="clock">{m.bus_sold_out()}</Badge>
		{/if}
	</div>
</article>
