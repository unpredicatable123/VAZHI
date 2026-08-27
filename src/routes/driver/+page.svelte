<script>
import SandboxNotice from '$components/booking/SandboxNotice.svelte';
import DestinationTracker from '$components/driver/DestinationTracker.svelte';
import Button from '$components/primitives/Button.svelte';
import EmptyState from '$components/primitives/EmptyState.svelte';
import ErrorState from '$components/primitives/ErrorState.svelte';
import Icon from '$components/primitives/Icon.svelte';
import Skeleton from '$components/primitives/Skeleton.svelte';
import StopProgressList from '$components/trip/StopProgressList.svelte';
import TripAssignmentCard from '$components/trip/TripAssignmentCard.svelte';
import * as m from '$lib/paraglide/messages';
import { getAssignedTrip, stopProgress, updateTripStatus } from '$services/trips.service';
import { session } from '$stores/session.svelte';
import { toasts } from '$stores/toast.svelte';
import { greetingFor } from '$utils/greeting';
/**
 * Driver dashboard.
 *
 * Operational, not administrative. A driver opens this at the start of a
 * duty and needs one answer: which trip am I on, and where does it start.
 * So the assignment card is the page, with the running order beside it and a
 * single button through to the work.
 *
 * The trip comes from the central trip record, which is why it is the same
 * trip the conductor on this service sees and the same one Operations
 * assigned.
 *
 * PRIVACY: a driver has no operational need for passenger identity and this
 * screen gives them none — not a name, not a seat, not a booking reference.
 * The route, the vehicle, and the times are all it carries.
 */
let view = $state(null);
let stops = $state([]);
let loadState = $state('loading');
let gpsProgress = $state(null);
async function load() {
    const driverId = session.current?.id;
    if (!driverId)
        return;
    loadState = 'loading';
    const result = await getAssignedTrip(driverId, 'driver');
    if (result.status === 'error') {
        // No roster entry is an empty state, not a failure: a driver between
        // duties should be told so rather than shown an error.
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
const greeting = $derived(greetingFor());

function applyGpsProgress(progress) {
    gpsProgress = Math.max(gpsProgress ?? 0, progress);
    if (view)
        stops = stopProgress(view, new Date(), gpsProgress);
}

async function moveTripTo(status) {
    if (!view)
        return false;
    const result = await updateTripStatus(view.trip.id, status, { allowOffline: false });
    if (result.status === 'error') {
        toasts.show(m.driver_gps_status_error(), 'warning');
        return false;
    }
    view = { ...view, trip: { ...view.trip, ...result.data, status } };
    stops = stopProgress(view, new Date(), gpsProgress);
    return true;
}

async function startTrip() {
    if (!view)
        return false;
    const status = view.trip.status;
    if (status === 'completed' || status === 'cancelled')
        return false;
    if ((status === 'scheduled' || status === 'published') && !(await moveTripTo('boarding')))
        return false;
    if (view.trip.status === 'boarding' && !(await moveTripTo('departed')))
        return false;
    return view.trip.status === 'departed' || view.trip.status === 'in-transit';
}

async function completeTrip() {
    if (!view)
        return false;
    if (view.trip.status === 'departed' && !(await moveTripTo('in-transit')))
        return false;
    if (view.trip.status !== 'in-transit')
        return view.trip.status === 'completed';
    const completed = await moveTripTo('completed');
    if (completed)
        applyGpsProgress(1);
    return completed;
}
</script>

<svelte:head>
	<title>{m.driver_dashboard_title()} — {m.app_name()}</title>
</svelte:head>

<div class="shell-width flex w-full flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
	<header class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h2 class="text-headline-sm text-text md:text-headline">
				{#if session.current}
					{m.driver_greeting({ greeting, name: session.current.displayName })}
				{:else}
					{m.driver_dashboard_title()}
				{/if}
			</h2>
			<p class="mt-1 text-body-sm text-text-muted">{m.driver_dashboard_subtitle()}</p>
		</div>
		{#if session.current}
			<div class="flex items-center gap-2 rounded-[8px] border border-border bg-surface px-3 py-2">
				<span class="text-primary-soft-text"><Icon name="steering" size={18} /></span>
				<span class="min-w-0">
					<span class="block text-caps uppercase text-text-muted">{m.driver_id_label()}</span>
					<span class="text-mono-data block text-body-sm text-text">{session.current.id}</span>
				</span>
			</div>
		{/if}
	</header>

	<SandboxNotice title={m.driver_simulated_title()} body={m.driver_simulated_body()} />

	{#if loadState === 'loading'}
		<div class="flex flex-col gap-4" aria-busy="true">
			<Skeleton width="100%" height="200px" radius="card" />
			<Skeleton width="100%" height="220px" radius="card" />
		</div>
	{:else if loadState === 'empty'}
		<EmptyState
			icon="calendar"
			title={m.assignment_none_title()}
			body={m.assignment_none_body()}
		/>
	{:else if loadState === 'error' || !view}
		<ErrorState title={m.trip_error_title()} body={m.trip_error_body()} onRetry={load} />
	{:else}
		<h3 class="text-caps uppercase text-text-muted">{m.driver_todays_assignment()}</h3>

		<DestinationTracker
			{view}
			onstart={startTrip}
			onprogress={applyGpsProgress}
			oncomplete={completeTrip}
		/>

		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<TripAssignmentCard {view} showCrew />

			<section
				class="rounded-card border border-border bg-surface p-4 shadow-level-1 md:p-6"
				aria-labelledby="driver-route-title"
			>
				<h3
					id="driver-route-title"
					class="flex items-center gap-2 text-title text-text"
				>
					<span class="text-primary-soft-text"><Icon name="list" size={20} /></span>
					{m.driver_route_title()}
				</h3>
				<StopProgressList {stops} class="mt-4" />
			</section>
		</div>

		<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
			<Button href="/driver/trip" size="lg" iconLeft="bus">{m.driver_view_trip()}</Button>
			<Button href="/driver/stops" variant="secondary" iconLeft="list">
				{m.driver_nav_stops()}
			</Button>
			<Button href="/driver/status" variant="secondary" iconLeft="route">
				{m.driver_nav_status()}
			</Button>
		</div>
	{/if}
</div>
