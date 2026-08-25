<script lang="ts">
	import TripSummaryCard from '$components/conductor/TripSummaryCard.svelte';
	import Button from '$components/primitives/Button.svelte';
	import ErrorState from '$components/primitives/ErrorState.svelte';
	import Icon from '$components/primitives/Icon.svelte';
	import Skeleton from '$components/primitives/Skeleton.svelte';
	import TransitMap from '$components/transit/TransitMap.svelte';
	import * as m from '$lib/paraglide/messages';
	import { getAssignment } from '$services/conductor.service';
	import { routeIdForJourney } from '$services/routes.service';
	import { session } from '$stores/session.svelte';
	import type { AsyncState } from '$types/common';
	import type { ConductorAssignment } from '$types/conductor';

	/**
	 * Assigned trip detail.
	 *
	 * Reuses the existing `TransitMap` so the crew sees the same route geometry
	 * the traveller side renders, with no additional map dependency.
	 */

	let assignment = $state<ConductorAssignment | null>(null);
	let loadState = $state<AsyncState>('loading');

	async function load() {
		const conductorId = session.current?.id;
		if (!conductorId) return;
		loadState = 'loading';
		const result = await getAssignment(conductorId);
		if (result.status === 'error') {
			loadState = 'error';
			return;
		}
		assignment = result.data;
		loadState = 'ready';
	}

	$effect(() => {
		if (session.current?.role === 'conductor') load();
	});
</script>

<svelte:head>
	<title>{m.conductor_trip_title()} — {m.app_name()}</title>
</svelte:head>

<div class="shell-width flex w-full flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
	<header>
		<h2 class="text-headline-sm text-text md:text-headline">{m.conductor_trip_title()}</h2>
		<p class="mt-1 text-body-sm text-text-muted">{m.conductor_trip_subtitle()}</p>
	</header>

	{#if loadState === 'loading'}
		<Skeleton width="100%" height="240px" radius="card" />
	{:else if loadState === 'error' || !assignment}
		<ErrorState title={m.tracking_error_title()} body={m.tracking_error_body()} onRetry={load} />
	{:else}
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<TripSummaryCard {assignment} status={assignment.status} />

			<div class="flex flex-col gap-3">
				<TransitMap
					routeId={routeIdForJourney(assignment.originStopId, assignment.destinationStopId)}
					label={m.map_label()}
					class="h-[280px] w-full rounded-card border border-border shadow-level-1 lg:h-[360px]"
				/>
				<p class="flex items-start gap-2 text-body-sm text-text-faint">
					<span class="mt-0.5 shrink-0"><Icon name="info" size={16} /></span>
					{m.conductor_simulated_body()}
				</p>
			</div>
		</div>

		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			<Button href="/conductor/passengers" variant="secondary" iconLeft="seat">
				{m.conductor_nav_passengers()}
			</Button>
			<Button href="/conductor/verify" iconLeft="scan">{m.conductor_nav_verify()}</Button>
		</div>
	{/if}
</div>
