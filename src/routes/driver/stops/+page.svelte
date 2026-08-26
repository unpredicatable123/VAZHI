<script>
import Badge from '$components/primitives/Badge.svelte';
import Button from '$components/primitives/Button.svelte';
import EmptyState from '$components/primitives/EmptyState.svelte';
import ErrorState from '$components/primitives/ErrorState.svelte';
import Icon from '$components/primitives/Icon.svelte';
import Skeleton from '$components/primitives/Skeleton.svelte';
import StopProgressList from '$components/trip/StopProgressList.svelte';
import TripStatusBadge from '$components/trip/TripStatusBadge.svelte';
import * as m from '$lib/paraglide/messages';
import { getLocale } from '$lib/paraglide/runtime';
import { getAssignedTrip, stopProgress } from '$services/trips.service';
import { session } from '$stores/session.svelte';
import { formatClock, placeName } from '$utils/format';
/**
 * Route and stops.
 *
 * The running order, with where the service has got to marked on it. The
 * two facts a driver actually wants — the stop they are at and the one
 * coming next — are lifted out of the list and shown first, because reading
 * them off a list while driving is exactly what should not be necessary.
 *
 * SIMULATION. Progress is derived from the trip status and the scheduled
 * times in the browser. No GPS receiver, telemetry feed, or transit API is
 * contacted, and the page says so.
 */
let view = $state(null);
let stops = $state([]);
let loadState = $state('loading');
async function load() {
    const driverId = session.current?.id;
    if (!driverId)
        return;
    loadState = 'loading';
    const result = await getAssignedTrip(driverId, 'driver');
    if (result.status === 'error') {
        loadState = result.error.code === 'not_found' ? 'empty' : 'error';
        return;
    }
    view = result.data;
    stops = stopProgress(result.data);
    loadState = 'ready';
}
$effect(() => {
    if (session.current?.role === 'driver')
        load();
});
const locale = $derived(getLocale());
const currentIndex = $derived(stops.findIndex((entry) => entry.state === 'current'));
const current = $derived(currentIndex === -1 ? null : stops[currentIndex]);
const next = $derived(currentIndex === -1 ? null : (stops[currentIndex + 1] ?? null));
const completedCount = $derived(stops.filter((entry) => entry.state === 'completed').length);
const remainingCount = $derived(stops.length - completedCount);
</script>

<svelte:head>
	<title>{m.driver_stops_title()} — {m.app_name()}</title>
</svelte:head>

<div class="shell-width flex w-full flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
	<header class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h2 class="text-headline-sm text-text md:text-headline">{m.driver_stops_title()}</h2>
			<p class="mt-1 text-body-sm text-text-muted">{m.driver_stops_subtitle()}</p>
		</div>
		{#if view}
			<TripStatusBadge status={view.trip.status} />
		{/if}
	</header>

	{#if loadState === 'loading'}
		<div class="flex flex-col gap-4" aria-busy="true">
			<Skeleton width="100%" height="140px" radius="card" />
			<Skeleton width="100%" height="320px" radius="card" />
		</div>
	{:else if loadState === 'empty'}
		<EmptyState icon="calendar" title={m.assignment_none_title()} body={m.assignment_none_body()} />
	{:else if loadState === 'error' || !view}
		<ErrorState title={m.trip_error_title()} body={m.trip_error_body()} onRetry={load} />
	{:else}
		<!-- Current and next, large enough to read at a glance. -->
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<div class="rounded-card border border-primary/40 bg-primary-soft p-4">
				<p class="text-caps uppercase text-primary-soft-text">{m.driver_current_stop()}</p>
				<p class="mt-1 text-title font-bold text-text">
					{current ? placeName(current.stop, locale) : m.driver_not_started()}
				</p>
				{#if current}
					<p class="text-mono-data text-body-sm text-text-muted">{formatClock(current.time)}</p>
				{/if}
			</div>
			<div class="rounded-card border border-border bg-surface p-4 shadow-level-1">
				<p class="text-caps uppercase text-text-muted">{m.driver_next_stop()}</p>
				<p class="mt-1 text-title font-bold text-text">
					{next ? placeName(next.stop, locale) : m.driver_final_stop()}
				</p>
				{#if next}
					<p class="text-mono-data text-body-sm text-text-muted">{formatClock(next.time)}</p>
				{/if}
			</div>
		</div>

		<section
			class="rounded-card border border-border bg-surface p-4 shadow-level-1 md:p-6"
			aria-labelledby="driver-stops-list-title"
		>
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h3 id="driver-stops-list-title" class="flex items-center gap-2 text-title text-text">
					<span class="text-primary-soft-text"><Icon name="route" size={20} /></span>
					{placeName(view.route, locale)}
				</h3>
				<div class="flex flex-wrap gap-2">
					<Badge tone="success" icon="check">
						{m.driver_stops_completed({ count: completedCount })}
					</Badge>
					<Badge tone="neutral" icon="flag">
						{m.driver_stops_remaining({ count: remainingCount })}
					</Badge>
				</div>
			</div>

			<StopProgressList {stops} class="mt-5" />

			<p class="mt-5 flex items-start gap-2 text-body-sm text-text-faint">
				<span class="mt-0.5 shrink-0"><Icon name="info" size={16} /></span>
				{m.driver_stops_simulated_note()}
			</p>
		</section>

		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			<Button href="/driver/status" iconLeft="route">{m.driver_nav_status()}</Button>
			<Button href="/driver/trip" variant="secondary" iconLeft="bus">
				{m.driver_nav_trip()}
			</Button>
		</div>
	{/if}
</div>
