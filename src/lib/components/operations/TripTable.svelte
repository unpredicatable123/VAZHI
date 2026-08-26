<script>
import EmptyState from '$components/primitives/EmptyState.svelte';
import TripStatusBadge from '$components/trip/TripStatusBadge.svelte';
import * as m from '$lib/paraglide/messages';
import { getLocale } from '$lib/paraglide/runtime';
import { formatClock, formatJourneyDate, placeName } from '$utils/format';
let { views, hideDate = false, class: className = '' } = $props();
const locale = $derived(getLocale());
function corridor(view) {
    const origin = view.boardingStop ?? view.route.stops[0];
    const destination = view.destinationStop ?? view.route.stops[view.route.stops.length - 1];
    const from = origin ? placeName(origin, locale) : view.trip.boardingStopId;
    const to = destination ? placeName(destination, locale) : view.trip.destinationStopId;
    return `${from} → ${to}`;
}
</script>

{#if views.length === 0}
	<EmptyState icon="route" title={m.ops_trips_empty_title()} body={m.ops_trips_empty_body()} />
{:else}
	<div class={className}>
		<!-- Desktop / tablet: aligned columns. -->
		<div class="hidden overflow-x-auto rounded-card border border-border bg-surface md:block">
			<table class="w-full border-collapse text-left">
				<caption class="sr-only">{m.ops_trips_table_caption()}</caption>
				<thead>
					<tr class="border-b border-border bg-surface-container">
						<th scope="col" class="px-4 py-3 text-caps uppercase text-text-muted">
							{m.ops_column_trip()}
						</th>
						{#if !hideDate}
							<th scope="col" class="px-4 py-3 text-caps uppercase text-text-muted">
								{m.ops_column_date()}
							</th>
						{/if}
						<th scope="col" class="px-4 py-3 text-caps uppercase text-text-muted">
							{m.ops_column_route()}
						</th>
						<th scope="col" class="px-4 py-3 text-caps uppercase text-text-muted">
							{m.ops_column_bus()}
						</th>
						<th scope="col" class="px-4 py-3 text-caps uppercase text-text-muted">
							{m.ops_column_time()}
						</th>
						<th scope="col" class="px-4 py-3 text-caps uppercase text-text-muted">
							{m.ops_column_crew()}
						</th>
						<th scope="col" class="px-4 py-3 text-caps uppercase text-text-muted">
							{m.ops_column_status()}
						</th>
					</tr>
				</thead>
				<tbody>
					{#each views as view (view.trip.id)}
						<tr class="border-b border-border last:border-0">
							<td class="px-4 py-3">
								<span class="text-mono-data text-body-sm font-semibold text-text">
									{view.trip.code}
								</span>
								<span class="block text-body-sm text-text-muted">{view.trip.serviceName}</span>
							</td>
							{#if !hideDate}
								<td class="px-4 py-3 text-body-sm text-text">
									{formatJourneyDate(view.trip.serviceDate, locale)}
								</td>
							{/if}
							<td class="px-4 py-3 text-body-sm text-text">{corridor(view)}</td>
							<td class="text-mono-data px-4 py-3 text-body-sm text-text">
								{view.bus.registrationNumber}
							</td>
							<td class="text-mono-data px-4 py-3 text-body-sm text-text">
								{formatClock(view.trip.departureTime)} → {formatClock(view.trip.arrivalTime)}
								{#if view.trip.platform}
									<span class="block text-caps uppercase text-text-muted">
										{m.trip_platform()} {view.trip.platform}
									</span>
								{/if}
							</td>
							<!-- Crew are identified by duty ID here: it is what a roster
							     sheet uses, and it keeps a name off a board on a wall. -->
							<td class="text-mono-data px-4 py-3 text-body-sm text-text">
								{view.trip.driverId}
								<span class="block text-text-muted">{view.trip.conductorId}</span>
							</td>
							<td class="px-4 py-3"><TripStatusBadge status={view.trip.status} /></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Mobile: one card per running. -->
		<ul class="flex flex-col gap-3 md:hidden">
			{#each views as view (view.trip.id)}
				<li class="rounded-card border border-border bg-surface p-4 shadow-level-1">
					<div class="flex flex-wrap items-start justify-between gap-2">
						<div>
							<p class="text-mono-data text-body font-semibold text-text">{view.trip.code}</p>
							<p class="text-body-sm text-text-muted">{view.trip.serviceName}</p>
						</div>
						<TripStatusBadge status={view.trip.status} />
					</div>

					<p class="mt-3 text-body-sm text-text">{corridor(view)}</p>

					<dl class="mt-3 grid grid-cols-2 gap-3">
						{#if !hideDate}
							<div>
								<dt class="text-caps uppercase text-text-muted">{m.ops_column_date()}</dt>
								<dd class="text-body-sm text-text">
									{formatJourneyDate(view.trip.serviceDate, locale)}
								</dd>
							</div>
						{/if}
						<div>
							<dt class="text-caps uppercase text-text-muted">{m.ops_column_time()}</dt>
							<dd class="text-mono-data text-body-sm text-text">
								{formatClock(view.trip.departureTime)} → {formatClock(view.trip.arrivalTime)}
							</dd>
						</div>
						<div>
							<dt class="text-caps uppercase text-text-muted">{m.ops_column_bus()}</dt>
							<dd class="text-mono-data text-body-sm text-text">
								{view.bus.registrationNumber}
							</dd>
						</div>
						<div>
							<dt class="text-caps uppercase text-text-muted">{m.ops_column_crew()}</dt>
							<dd class="text-mono-data text-body-sm text-text">
								{view.trip.driverId} / {view.trip.conductorId}
							</dd>
						</div>
						{#if view.trip.platform}
							<div>
								<dt class="text-caps uppercase text-text-muted">{m.trip_platform()}</dt>
								<dd class="text-mono-data text-body-sm text-text">{view.trip.platform}</dd>
							</div>
						{/if}
					</dl>
				</li>
			{/each}
		</ul>
	</div>
{/if}
