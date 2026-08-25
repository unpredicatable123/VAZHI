<script lang="ts">
	import Icon from '$components/primitives/Icon.svelte';
	import TripStatusBadge from '$components/trip/TripStatusBadge.svelte';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import type { ConductorAssignment } from '$types/conductor';
	import type { TripStatus } from '$types/fleet';
	import type { Locale } from '$types/preferences';
	import {
		formatClock,
		formatDistance,
		formatDuration,
		formatJourneyDate,
		placeName
	} from '$utils/format';

	/**
	 * The assigned service. Public timetable and vehicle data only.
	 */

	interface Props {
		assignment: ConductorAssignment;
		status: TripStatus;
		/** Compact form omits the secondary detail grid. */
		compact?: boolean;
	}

	let { assignment, status, compact = false }: Props = $props();

	const locale = $derived(getLocale() as Locale);

	// Place names live on the assignment in both spellings, so the card reads in
	// the crew member's own language rather than always in English.
	const originName = $derived(
		placeName({ name: assignment.originName, nameTa: assignment.originNameTa }, locale)
	);
	const destinationName = $derived(
		placeName(
			{ name: assignment.destinationName, nameTa: assignment.destinationNameTa },
			locale
		)
	);

</script>

<section
	class="rounded-card border border-border bg-surface p-4 shadow-level-1 md:p-6"
	aria-labelledby="assignment-title"
>
	<div class="flex flex-wrap items-start justify-between gap-3">
		<h3 id="assignment-title" class="flex items-center gap-2 text-title text-text">
			<span class="text-primary-soft-text"><Icon name="bus" size={20} /></span>
			{m.conductor_assignment_title()}
		</h3>
		<TripStatusBadge {status} />
	</div>

	<p class="mt-3 text-body font-semibold text-text">{assignment.serviceName}</p>
	<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
		<p class="text-mono-data text-body-sm text-text-muted">{assignment.vehicleNumber}</p>
		<p class="text-mono-data text-body-sm text-text-muted">
			<span class="text-caps uppercase">{m.trip_reference()}</span>
			{assignment.tripCode}
		</p>
	</div>

	<div
		class="mt-4 flex flex-col gap-3 rounded-[8px] bg-surface-container p-4 sm:flex-row
			sm:items-center sm:justify-between"
	>
		<div class="flex min-w-0 flex-col">
			<span class="text-mono-data text-title font-bold text-text">
				{formatClock(assignment.departure)}
			</span>
			<span class="text-body-sm text-text-muted">{originName}</span>
		</div>
		<Icon name="arrow-right" size={20} class="shrink-0 text-text-muted" />
		<div class="flex min-w-0 flex-col sm:text-right">
			<span class="text-mono-data text-title font-bold text-text">
				{formatClock(assignment.arrival)}
			</span>
			<span class="text-body-sm text-text-muted">{destinationName}</span>
		</div>
	</div>

	<dl class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
		<div>
			<dt class="text-caps uppercase text-text-muted">{m.conductor_trip_platform()}</dt>
			<dd class="text-mono-data text-title font-semibold text-text">
				{assignment.boardingPlatform}
			</dd>
		</div>
		<div>
			<dt class="text-caps uppercase text-text-muted">{m.conductor_trip_date()}</dt>
			<dd class="text-body-sm text-text">
				{formatJourneyDate(assignment.travelDate, locale)}
			</dd>
		</div>
		{#if !compact}
			<div>
				<dt class="text-caps uppercase text-text-muted">{m.conductor_trip_duration()}</dt>
				<dd class="text-mono-data text-body-sm text-text">
					{formatDuration(assignment.durationMinutes)}
				</dd>
			</div>
			<div>
				<dt class="text-caps uppercase text-text-muted">{m.conductor_trip_distance()}</dt>
				<dd class="text-mono-data text-body-sm text-text">
					{formatDistance(assignment.distanceKm)}
				</dd>
			</div>
			<div>
				<dt class="text-caps uppercase text-text-muted">{m.conductor_trip_layout()}</dt>
				<dd class="text-body-sm text-text">{assignment.seatLayout}</dd>
			</div>
			<div>
				<dt class="text-caps uppercase text-text-muted">{m.conductor_stat_capacity()}</dt>
				<dd class="text-mono-data text-body-sm text-text">{assignment.capacity}</dd>
			</div>
		{/if}
	</dl>
</section>
