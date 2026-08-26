<script>
import Button from '$components/primitives/Button.svelte';
import EmptyState from '$components/primitives/EmptyState.svelte';
import ErrorState from '$components/primitives/ErrorState.svelte';
import Icon from '$components/primitives/Icon.svelte';
import Skeleton from '$components/primitives/Skeleton.svelte';
import TransitMap from '$components/transit/TransitMap.svelte';
import StopProgressList from '$components/trip/StopProgressList.svelte';
import TripAssignmentCard from '$components/trip/TripAssignmentCard.svelte';
import TripStatusControl from '$components/trip/TripStatusControl.svelte';
import * as m from '$lib/paraglide/messages';
import { getAssignedTrip, nextStatus, stopProgress, updateTripStatus } from '$services/trips.service';
import { session } from '$stores/session.svelte';
import { toasts } from '$stores/toast.svelte';
import { tripStatusLabel } from '$utils/trip-status';
/**
 * Driver trip detail.
 *
 * Everything about the running in one place, and the control that advances
 * it. The status change writes through `trips.service` to the shared trip
 * record, so pressing "Departed" here is what the conductor's card and the
 * Operations board show a moment later — there is no second copy of the
 * state to fall out of step.
 *
 * The map reuses the traveller-side `TransitMap` and the geometry already
 * bundled under `static/geo`, so the crew sees the same corridor with no
 * extra dependency and no tile host.
 *
 * PRIVACY: no passenger information reaches this screen.
 */
let view = $state(null);
let stops = $state([]);
let loadState = $state('loading');
let advancing = $state(false);
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
async function advance(to) {
    if (!view)
        return;
    advancing = true;
    const result = await updateTripStatus(view.trip.id, to);
    advancing = false;
    if (result.status === 'error') {
        toasts.show(m.trip_status_invalid_transition(), 'warning');
        return;
    }
    toasts.show(m.trip_status_updated({ status: tripStatusLabel(to) }), 'success');
    await load();
}
$effect(() => {
    if (session.current?.role === 'driver')
        load();
});
const next = $derived(view ? nextStatus(view.trip.status) : null);
</script>

<svelte:head>
	<title>{m.driver_trip_title()} — {m.app_name()}</title>
</svelte:head>

<div class="shell-width flex w-full flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
	<header>
		<h2 class="text-headline-sm text-text md:text-headline">{m.driver_trip_title()}</h2>
		<p class="mt-1 text-body-sm text-text-muted">{m.driver_trip_subtitle()}</p>
	</header>

	{#if loadState === 'loading'}
		<div class="flex flex-col gap-4" aria-busy="true">
			<Skeleton width="100%" height="240px" radius="card" />
			<Skeleton width="100%" height="200px" radius="card" />
		</div>
	{:else if loadState === 'empty'}
		<EmptyState icon="calendar" title={m.assignment_none_title()} body={m.assignment_none_body()} />
	{:else if loadState === 'error' || !view}
		<ErrorState title={m.trip_error_title()} body={m.trip_error_body()} onRetry={load} />
	{:else}
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<div class="flex flex-col gap-6">
				<TripAssignmentCard {view} showCrew />
				<TripStatusControl
					status={view.trip.status}
					{next}
					busy={advancing}
					onadvance={advance}
				/>
			</div>

			<div class="flex flex-col gap-6">
				{#if view.route.geometryId}
					<div class="flex flex-col gap-3">
						<TransitMap
							routeId={view.route.geometryId}
							label={m.map_label()}
							class="h-[260px] w-full rounded-card border border-border shadow-level-1 lg:h-[320px]"
						/>
						<p class="flex items-start gap-2 text-body-sm text-text-faint">
							<span class="mt-0.5 shrink-0"><Icon name="info" size={16} /></span>
							{m.driver_simulated_body()}
						</p>
					</div>
				{/if}

				<section
					class="rounded-card border border-border bg-surface p-4 shadow-level-1 md:p-6"
					aria-labelledby="driver-trip-route-title"
				>
					<h3 id="driver-trip-route-title" class="flex items-center gap-2 text-title text-text">
						<span class="text-primary-soft-text"><Icon name="list" size={20} /></span>
						{m.driver_route_title()}
					</h3>
					<StopProgressList {stops} class="mt-4" />
				</section>
			</div>
		</div>

		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			<Button href="/driver/stops" variant="secondary" iconLeft="list">
				{m.driver_nav_stops()}
			</Button>
			<Button href="/driver" variant="secondary" iconLeft="gauge">
				{m.driver_nav_dashboard()}
			</Button>
		</div>
	{/if}
</div>
