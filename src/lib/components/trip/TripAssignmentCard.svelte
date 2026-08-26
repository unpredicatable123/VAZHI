<script>
import Icon from '$components/primitives/Icon.svelte';
import TripStatusBadge from './TripStatusBadge.svelte';
import * as m from '$lib/paraglide/messages';
import { getLocale } from '$lib/paraglide/runtime';
import { formatClock, formatDistance, formatDuration, formatJourneyDate, placeName } from '$utils/format';
let { view, showCrew = false, compact = false, class: className = '' } = $props();
const locale = $derived(getLocale());
const trip = $derived(view.trip);
// A short-worked running boards or terminates somewhere the corridor does
// not list, so fall back to the terminus rather than showing a raw id.
const origin = $derived(view.boardingStop ?? view.route.stops[0]);
const destination = $derived(view.destinationStop ?? view.route.stops[view.route.stops.length - 1]);
</script>

<section
	class="rounded-card border border-border bg-surface p-4 shadow-level-1 md:p-6 {className}"
	aria-labelledby="trip-assignment-title"
>
	<div class="flex flex-wrap items-start justify-between gap-3">
		<h3 id="trip-assignment-title" class="flex items-center gap-2 text-title text-text">
			<span class="text-primary-soft-text"><Icon name="bus" size={20} /></span>
			{m.trip_assignment_title()}
		</h3>
		<TripStatusBadge status={trip.status} />
	</div>

	<p class="mt-3 text-body font-semibold text-text">{trip.serviceName}</p>
	<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
		<p class="text-mono-data text-body-sm text-text-muted">{view.bus.registrationNumber}</p>
		<p class="text-mono-data text-body-sm text-text-muted">
			<span class="text-caps uppercase">{m.trip_reference()}</span>
			{trip.code}
		</p>
	</div>

	<div
		class="mt-4 flex flex-col gap-3 rounded-[8px] bg-surface-container p-4 sm:flex-row
			sm:items-center sm:justify-between"
	>
		<div class="flex min-w-0 flex-col">
			<span class="text-mono-data text-title font-bold text-text">
				{formatClock(trip.departureTime)}
			</span>
			<span class="text-body-sm text-text-muted">
				{origin ? placeName(origin, locale) : trip.boardingStopId}
			</span>
		</div>
		<Icon name="arrow-right" size={20} class="shrink-0 text-text-muted" />
		<div class="flex min-w-0 flex-col sm:text-right">
			<span class="text-mono-data text-title font-bold text-text">
				{formatClock(trip.arrivalTime)}
			</span>
			<span class="text-body-sm text-text-muted">
				{destination ? placeName(destination, locale) : trip.destinationStopId}
			</span>
		</div>
	</div>

	<dl class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
		<div>
			<dt class="text-caps uppercase text-text-muted">{m.trip_platform()}</dt>
			<dd class="text-mono-data text-title font-semibold text-text">
				{trip.platform ?? '--'}
			</dd>
		</div>
		<div>
			<dt class="text-caps uppercase text-text-muted">{m.trip_service_date()}</dt>
			<dd class="text-body-sm text-text">{formatJourneyDate(trip.serviceDate, locale)}</dd>
		</div>
		{#if !compact}
			<div>
				<dt class="text-caps uppercase text-text-muted">{m.trip_route()}</dt>
				<dd class="text-body-sm text-text">{placeName(view.route, locale)}</dd>
			</div>
			<div>
				<dt class="text-caps uppercase text-text-muted">{m.trip_duration()}</dt>
				<dd class="text-mono-data text-body-sm text-text">
					{formatDuration(view.durationMinutes)}
				</dd>
			</div>
			<div>
				<dt class="text-caps uppercase text-text-muted">{m.trip_distance()}</dt>
				<dd class="text-mono-data text-body-sm text-text">
					{formatDistance(view.distanceKm)}
				</dd>
			</div>
			<div>
				<dt class="text-caps uppercase text-text-muted">{m.trip_layout()}</dt>
				<dd class="text-body-sm text-text">{view.bus.seatLayout}</dd>
			</div>
		{/if}
		{#if showCrew}
			<!-- Crew are identified to each other by duty ID, which is what a
			     depot sheet and a radio call both use. A roster name adds nothing
			     operational here, so it is not shown. -->
			<div>
				<dt class="text-caps uppercase text-text-muted">{m.trip_driver()}</dt>
				<dd class="text-mono-data text-body-sm text-text">{trip.driverId}</dd>
			</div>
			<div>
				<dt class="text-caps uppercase text-text-muted">{m.trip_conductor()}</dt>
				<dd class="text-mono-data text-body-sm text-text">{trip.conductorId}</dd>
			</div>
		{/if}
	</dl>
</section>
