<script lang="ts">
	import Button from '$components/primitives/Button.svelte';
	import EmptyState from '$components/primitives/EmptyState.svelte';
	import ErrorState from '$components/primitives/ErrorState.svelte';
	import Icon from '$components/primitives/Icon.svelte';
	import Skeleton from '$components/primitives/Skeleton.svelte';
	import TripAssignmentCard from '$components/trip/TripAssignmentCard.svelte';
	import TripStatusControl from '$components/trip/TripStatusControl.svelte';
	import * as m from '$lib/paraglide/messages';
	import {
		getAssignedTrip,
		nextStatus,
		updateTripStatus
	} from '$services/trips.service';
	import { session } from '$stores/session.svelte';
	import { toasts } from '$stores/toast.svelte';
	import type { AsyncState } from '$types/common';
	import type { TripStatus, TripView } from '$types/fleet';
	import { tripStatusLabel } from '$utils/trip-status';

	/**
	 * Trip status.
	 *
	 * The one screen a driver reaches for while the bus is moving, so it is
	 * deliberately the thinnest page in the workspace: which trip, what state,
	 * one button. The trip card is compact here — the detail lives on
	 * `/driver/trip` and repeating it would only push the button down the page.
	 *
	 * The change is written to the shared trip record, so the conductor and
	 * Operations see it. Nothing about a passenger appears on this screen.
	 */

	let view = $state<TripView | null>(null);
	let loadState = $state<AsyncState>('loading');
	let advancing = $state(false);

	async function load() {
		const driverId = session.current?.id;
		if (!driverId) return;
		loadState = 'loading';

		const result = await getAssignedTrip(driverId, 'driver');
		if (result.status === 'error') {
			loadState = result.error.code === 'not_found' ? 'empty' : 'error';
			return;
		}

		view = result.data;
		loadState = 'ready';
	}

	async function advance(to: TripStatus) {
		if (!view) return;
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
		if (session.current?.role === 'driver') load();
	});

	const next = $derived(view ? nextStatus(view.trip.status) : null);
</script>

<svelte:head>
	<title>{m.driver_status_title()} — {m.app_name()}</title>
</svelte:head>

<div class="shell-width flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
	<header>
		<h2 class="text-headline-sm text-text md:text-headline">{m.driver_status_title()}</h2>
		<p class="mt-1 text-body-sm text-text-muted">{m.driver_status_subtitle()}</p>
	</header>

	{#if loadState === 'loading'}
		<div class="flex flex-col gap-4" aria-busy="true">
			<Skeleton width="100%" height="160px" radius="card" />
			<Skeleton width="100%" height="280px" radius="card" />
		</div>
	{:else if loadState === 'empty'}
		<EmptyState icon="calendar" title={m.assignment_none_title()} body={m.assignment_none_body()} />
	{:else if loadState === 'error' || !view}
		<ErrorState title={m.trip_error_title()} body={m.trip_error_body()} onRetry={load} />
	{:else}
		<TripAssignmentCard {view} compact />
		<TripStatusControl status={view.trip.status} {next} busy={advancing} onadvance={advance} />

		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			<Button href="/driver/stops" variant="secondary" iconLeft="list">
				{m.driver_nav_stops()}
			</Button>
			<Button href="/driver" variant="secondary" iconLeft="gauge">
				{m.driver_nav_dashboard()}
			</Button>
		</div>

		<p class="flex items-start gap-2 text-body-sm text-text-faint">
			<span class="mt-0.5 shrink-0"><Icon name="shield" size={16} /></span>
			{m.driver_privacy_note()}
		</p>
	{/if}
</div>
