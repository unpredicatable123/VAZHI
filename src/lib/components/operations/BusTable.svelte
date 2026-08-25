<script lang="ts">
	import Badge from '$components/primitives/Badge.svelte';
	import Button from '$components/primitives/Button.svelte';
	import EmptyState from '$components/primitives/EmptyState.svelte';
	import TripStatusBadge from '$components/trip/TripStatusBadge.svelte';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import type { BusRow } from './bus-row';
	import type { Locale } from '$types/preferences';
	import { formatClock, formatJourneyDate, placeName } from '$utils/format';

	/**
	 * The fleet.
	 *
	 * Vehicle facts on the left, current working on the right — and the two are
	 * visibly different kinds of thing. The vehicle columns are permanent: plate,
	 * class, capacity, layout, fittings. The assignment column is *today's
	 * answer only*, looked up through the trips, and it is labelled as the
	 * current trip rather than as a property of the bus. Nothing here writes a
	 * route onto a vehicle, because tomorrow the same plate is somewhere else.
	 */

	interface Props {
		rows: BusRow[];
		/** Omitted where the table is read-only. */
		onedit?: (bus: BusRow['bus']) => void;
		onremove?: (bus: BusRow['bus']) => void;
		class?: string;
	}

	let { rows, onedit, onremove, class: className = '' }: Props = $props();

	const editable = $derived(onedit !== undefined || onremove !== undefined);

	const locale = $derived(getLocale() as Locale);

	function amenityLabels(row: BusRow): string[] {
		const labels: string[] = [];
		if (row.bus.amenities.airConditioned) labels.push(m.amenity_ac());
		if (row.bus.amenities.chargingPoints) labels.push(m.amenity_charging());
		if (row.bus.amenities.restStop) labels.push(m.amenity_rest_stop());
		if (row.bus.accessibleBoardingPoint) labels.push(m.amenity_accessible());
		return labels;
	}
</script>

{#if rows.length === 0}
	<EmptyState icon="bus" title={m.ops_buses_empty_title()} body={m.ops_buses_empty_body()} />
{:else}
	<div class={className}>
		<!-- Desktop / tablet -->
		<div class="hidden overflow-x-auto rounded-card border border-border bg-surface md:block">
			<table class="w-full border-collapse text-left">
				<caption class="sr-only">{m.ops_buses_table_caption()}</caption>
				<thead>
					<tr class="border-b border-border bg-surface-container">
						<th scope="col" class="px-4 py-3 text-caps uppercase text-text-muted">
							{m.ops_column_registration()}
						</th>
						<th scope="col" class="px-4 py-3 text-caps uppercase text-text-muted">
							{m.ops_column_service_type()}
						</th>
						<th scope="col" class="px-4 py-3 text-caps uppercase text-text-muted">
							{m.ops_column_seats()}
						</th>
						<th scope="col" class="px-4 py-3 text-caps uppercase text-text-muted">
							{m.ops_column_fittings()}
						</th>
						<th scope="col" class="px-4 py-3 text-caps uppercase text-text-muted">
							{m.ops_column_current_trip()}
						</th>
						{#if editable}
							<th scope="col" class="px-4 py-3 text-caps uppercase text-text-muted">
								<span class="sr-only">{m.ops_column_actions()}</span>
							</th>
						{/if}
					</tr>
				</thead>
				<tbody>
					{#each rows as row (row.bus.id)}
						<tr class="border-b border-border last:border-0">
							<td class="text-mono-data px-4 py-3 text-body-sm font-semibold text-text">
								{row.bus.registrationNumber}
							</td>
							<td class="px-4 py-3 text-body-sm text-text">
								{row.bus.serviceType}
								<span class="block text-body-sm text-text-muted">{row.bus.operator}</span>
							</td>
							<td class="text-mono-data px-4 py-3 text-body-sm text-text">
								{m.ops_seat_count({ count: row.bus.totalSeats })}
								<span class="block text-text-muted">{row.bus.seatLayout}</span>
							</td>
							<td class="px-4 py-3">
								<div class="flex flex-wrap gap-1.5">
									{#each amenityLabels(row) as label (label)}
										<Badge tone="neutral">{label}</Badge>
									{/each}
								</div>
							</td>
							<td class="px-4 py-3 text-body-sm">
								{#if row.currentTrip}
									<span class="text-mono-data font-semibold text-text">
										{row.currentTrip.trip.code}
									</span>
									<span class="block text-text">{placeName(row.currentTrip.route, locale)}</span>
									<span class="block text-text-muted">
										{formatJourneyDate(row.currentTrip.trip.serviceDate, locale)}
										· {formatClock(row.currentTrip.trip.departureTime)}
									</span>
									<TripStatusBadge status={row.currentTrip.trip.status} class="mt-1" />
								{:else}
									<span class="text-text-faint">{m.ops_bus_unassigned()}</span>
								{/if}
							</td>
							{#if editable}
								<td class="px-4 py-3">
									<div class="flex justify-end gap-1">
										{#if onedit}
											<Button variant="ghost" onclick={() => onedit(row.bus)}>
												{m.ops_action_edit()}
											</Button>
										{/if}
										{#if onremove}
											<Button variant="ghost" onclick={() => onremove(row.bus)}>
												{m.ops_action_remove()}
											</Button>
										{/if}
									</div>
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Mobile -->
		<ul class="flex flex-col gap-3 md:hidden">
			{#each rows as row (row.bus.id)}
				<li class="rounded-card border border-border bg-surface p-4 shadow-level-1">
					<p class="text-mono-data text-body font-semibold text-text">
						{row.bus.registrationNumber}
					</p>
					<p class="text-body-sm text-text">{row.bus.serviceType}</p>
					<p class="text-mono-data text-body-sm text-text-muted">
						{m.ops_seat_count({ count: row.bus.totalSeats })} · {row.bus.seatLayout}
					</p>

					<div class="mt-2 flex flex-wrap gap-1.5">
						{#each amenityLabels(row) as label (label)}
							<Badge tone="neutral">{label}</Badge>
						{/each}
					</div>

					<div class="mt-3 border-t border-border pt-3">
						<p class="text-caps uppercase text-text-muted">{m.ops_column_current_trip()}</p>
						{#if row.currentTrip}
							<p class="text-mono-data text-body-sm font-semibold text-text">
								{row.currentTrip.trip.code}
							</p>
							<p class="text-body-sm text-text">{placeName(row.currentTrip.route, locale)}</p>
							<p class="text-body-sm text-text-muted">
								{formatJourneyDate(row.currentTrip.trip.serviceDate, locale)}
								· {formatClock(row.currentTrip.trip.departureTime)}
							</p>
							<TripStatusBadge status={row.currentTrip.trip.status} class="mt-1" />
						{:else}
							<p class="text-body-sm text-text-faint">{m.ops_bus_unassigned()}</p>
						{/if}
					</div>

					{#if editable}
						<div class="mt-3 flex gap-2 border-t border-border pt-3">
							{#if onedit}
								<Button variant="secondary" onclick={() => onedit(row.bus)}>
									{m.ops_action_edit()}
								</Button>
							{/if}
							{#if onremove}
								<Button variant="ghost" onclick={() => onremove(row.bus)}>
									{m.ops_action_remove()}
								</Button>
							{/if}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	</div>
{/if}
