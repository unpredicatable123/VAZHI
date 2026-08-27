<script>
import { onDestroy } from 'svelte';
import Button from '$components/primitives/Button.svelte';
import Icon from '$components/primitives/Icon.svelte';
import * as m from '$lib/paraglide/messages';
import { getLocale } from '$lib/paraglide/runtime';
import { isReliableDestinationArrival, routeLocationProgress } from '$utils/geo-progress';
import { formatDistance, placeName } from '$utils/format';

let { view, onstart, onprogress, oncomplete } = $props();
let state = $state('idle');
let progress = $state(0);
let remainingMetres = $state(null);
let accuracyMetres = $state(null);
let watchId = null;
let arrivalFixes = 0;
let completing = false;
const locale = $derived(getLocale());
const destination = $derived(view.destinationStop ?? view.route.stops[view.route.stops.length - 1]);
const percent = $derived(Math.round(progress * 100));
const remainingDistance = $derived(remainingMetres === null
    ? null
    : formatDistance(Math.round((remainingMetres / 1000) * 10) / 10));

function stopWatching(nextState = 'idle') {
    if (watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation)
        navigator.geolocation.clearWatch(watchId);
    watchId = null;
    if (state !== 'completed')
        state = nextState;
}

function locationError(error) {
    stopWatching(error?.code === 1 ? 'denied' : 'error');
}

async function acceptPosition(position) {
    const coordinates = [position.coords.longitude, position.coords.latitude];
    const result = routeLocationProgress(view.route.stops, coordinates);
    if (!result) {
        stopWatching('unavailable');
        return;
    }
    // GPS noise must never move the running backwards on the driver's screen.
    progress = Math.max(progress, result.progress);
    remainingMetres = Math.max(0, result.remainingMetres);
    accuracyMetres = position.coords.accuracy;
    onprogress(progress);
    arrivalFixes = isReliableDestinationArrival(result, position.coords.accuracy) ? arrivalFixes + 1 : 0;
    // Two accurate fixes prevent one transient GPS jump from closing the trip.
    if (arrivalFixes >= 2 && !completing) {
        completing = true;
        state = 'completing';
        const completed = await oncomplete();
        completing = false;
        if (completed) {
            progress = 1;
            remainingMetres = 0;
            onprogress(1);
            stopWatching('completed');
            state = 'completed';
        }
        else {
            state = 'error';
        }
    }
}

async function beginTracking(initialPosition) {
    const started = await onstart();
    if (!started) {
        state = 'error';
        return;
    }
    state = 'tracking';
    await acceptPosition(initialPosition);
    if (state !== 'tracking')
        return;
    watchId = navigator.geolocation.watchPosition(
        (position) => void acceptPosition(position),
        locationError,
        { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 }
    );
}

function startTracking() {
    if (!routeLocationProgress(view.route.stops, destination?.coordinates ?? [])) {
        state = 'unavailable';
        return;
    }
    if (typeof window === 'undefined' || !window.isSecureContext || !navigator.geolocation) {
        state = 'unavailable';
        return;
    }
    state = 'requesting';
    navigator.geolocation.getCurrentPosition(
        (position) => void beginTracking(position),
        locationError,
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 }
    );
}

function stateMessage() {
    if (state === 'requesting') return m.driver_gps_requesting();
    if (state === 'tracking') return m.driver_gps_tracking();
    if (state === 'completing') return m.driver_gps_completing();
    if (state === 'completed') return m.driver_gps_completed();
    if (state === 'denied') return m.driver_gps_denied();
    if (state === 'unavailable') return m.driver_gps_unavailable();
    if (state === 'error') return m.driver_gps_error();
    return m.driver_gps_idle();
}

$effect(() => {
    if (view.trip.status === 'completed') {
        state = 'completed';
        progress = 1;
        remainingMetres = 0;
    }
});

onDestroy(() => stopWatching());
</script>

<section class="rounded-card border border-border bg-surface p-4 shadow-level-1 md:p-6" aria-labelledby="driver-destination-title">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<p class="text-caps uppercase text-text-muted">{m.driver_destination_label()}</p>
			<h3 id="driver-destination-title" class="mt-1 flex items-center gap-2 text-title text-text">
				<span class="text-primary-soft-text"><Icon name="target" size={20} /></span>
				{destination ? placeName(destination, locale) : view.trip.destinationStopId}
			</h3>
		</div>
		<span class="text-mono-data text-title font-bold text-text">{percent}%</span>
	</div>

	<div class="mt-4 h-2 overflow-hidden rounded-full bg-surface-container" role="progressbar" aria-label={m.driver_destination_progress()} aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent}>
		<div class="h-full rounded-full bg-primary transition-[width] duration-500" style={`width: ${percent}%`}></div>
	</div>

	<div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-body-sm text-text-muted">
		<p>{stateMessage()}</p>
		{#if remainingDistance !== null}
			<p>{m.driver_destination_remaining({ distance: remainingDistance })}</p>
		{/if}
	</div>
	{#if accuracyMetres !== null && state === 'tracking'}
		<p class="mt-1 text-caps uppercase text-text-faint">{m.driver_gps_accuracy({ metres: Math.round(accuracyMetres) })}</p>
	{/if}

	<div class="mt-4 flex flex-wrap gap-3">
		{#if state === 'completed'}
			<p class="flex items-center gap-2 text-body-sm font-semibold text-success">
				<Icon name="check" size={18} /> {m.driver_final_stop()}
			</p>
		{:else if state === 'tracking' || state === 'completing'}
			<Button variant="secondary" onclick={() => stopWatching()} disabled={state === 'completing'}>
				{m.driver_gps_stop()}
			</Button>
		{:else}
			<Button size="lg" iconLeft="target" loading={state === 'requesting'} onclick={startTracking}>
				{view.trip.status === 'departed' || view.trip.status === 'in-transit'
					? m.driver_gps_resume()
					: m.driver_start_trip()}
			</Button>
		{/if}
	</div>

	<p class="mt-4 flex items-start gap-2 text-body-sm text-text-faint">
		<span class="mt-0.5 shrink-0"><Icon name="shield" size={16} /></span>
		{m.driver_gps_privacy()}
	</p>
</section>
