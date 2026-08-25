<script lang="ts">
	import Button from '$components/primitives/Button.svelte';
	import EmptyState from '$components/primitives/EmptyState.svelte';
	import ErrorState from '$components/primitives/ErrorState.svelte';
	import Icon from '$components/primitives/Icon.svelte';
	import Skeleton from '$components/primitives/Skeleton.svelte';
	import TripStatusBadge from '$components/trip/TripStatusBadge.svelte';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import { listTripViews } from '$services/trips.service';
	import { session } from '$stores/session.svelte';
	import type { AsyncState } from '$types/common';
	import type { TripView } from '$types/fleet';
	import type { Locale } from '$types/preferences';
	import { formatClock, formatJourneyDate, placeName } from '$utils/format';

	/**
	 * Assignment management.
	 *
	 * The trip board shows runnings; this screen shows the *four things each
	 * running holds* — corridor, vehicle, driver, conductor — laid out as four
	 * columns of one card so the join is the shape of the page rather than a fact
	 * you have to infer from a table row.
	 *
	 * Grouped by vehicle, because that is the grouping that proves the model. A
	 * plate with two cards under it, naming two different corridors, is the
	 * "same bus, different route" case made visible; the callout below points
	 * straight at it.
	 */

	let views = $state<TripView[]>([]);
	let loadState = $state<AsyncState>('loading');

	async function load() {
		loadState = 'loading';
		const result = await listTripViews();
		if (result.status === 'error') {
			loadState = 'error';
			return;
		}
		views = result.data;
		loadState = 'ready';
	}

	$effect(() => {
		if (session.current?.role === 'operations') load();
	});

	const locale = $derived(getLocale() as Locale);

	interface VehicleGroup {
		registrationNumber: string;
		busId: string;
		trips: TripView[];
		/** True when this vehicle works more than one corridor. */
		multiRoute: boolean;
	}

	const groups: VehicleGroup[] = $derived.by(() => {
		const byBus = new Map<string, TripView[]>();
		for (const view of views) {
			const existing = byBus.get(view.bus.id);
			if (existing) existing.push(view);
			else byBus.set(view.bus.id, [view]);
		}

		return [...byBus.entries()]
			.map(([busId, trips]) => ({
				busId,
				registrationNumber: trips[0].bus.registrationNumber,
				trips,
				multiRoute: new Set(trips.map((view) => view.route.id)).size > 1
			}))
			// Vehicles working more than one corridor lead, because they are the
			// ones a controller wants to look at.
			.sort((a, b) => {
				if (a.multiRoute !== b.multiRoute) return a.multiRoute ? -1 : 1;
				return a.registrationNumber.localeCompare(b.registrationNumber);
			});
	});
</script>

<svelte:head>
	<title>{m.ops_assignments_title()} — {m.app_name()}</title>
</svelte:head>

<div class="shell-width flex w-full flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
	<header class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h2 class="text-headline-sm text-text md:text-headline">{m.ops_assignments_title()}</h2>
			<p class="mt-1 text-body-sm text-text-muted">{m.ops_assignments_subtitle()}</p>
		</div>
		<Button href="/operations/trips/new" iconLeft="plus">{m.ops_create_trip()}</Button>
	</header>

	<p
		class="flex items-start gap-2 rounded-[8px] border border-border bg-surface-container p-3
			text-body-sm text-text-muted"
	>
		<span class="mt-0.5 shrink-0 text-primary-soft-text"><Icon name="info" size={16} /></span>
		{m.ops_assignments_note()}
	</p>

	{#if loadState === 'loading'}
		<Skeleton width="100%" height="400px" radius="card" />
	{:else if loadState === 'error'}
		<ErrorState title={m.ops_error_title()} body={m.ops_error_body()} onRetry={load} />
	{:else if groups.length === 0}
		<EmptyState icon="sliders" title={m.ops_trips_empty_title()} body={m.ops_trips_empty_body()} />
	{:else}
		<ul class="flex flex-col gap-5">
			{#each groups as group (group.busId)}
				<li class="rounded-card border border-border bg-surface p-4 shadow-level-1 md:p-6">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<h3 class="flex items-center gap-2 text-title text-text">
							<span class="text-primary-soft-text"><Icon name="bus" size={20} /></span>
							<span class="text-mono-data">{group.registrationNumber}</span>
						</h3>
						{#if group.multiRoute}
							<!-- The case the whole trip model exists to allow. -->
							<span
								class="flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1
									text-caps uppercase text-primary-soft-text"
							>
								<Icon name="swap" size={14} />
								{m.ops_multi_route_badge()}
							</span>
						{/if}
					</div>

					<ul class="mt-4 flex flex-col gap-3">
						{#each group.trips as view (view.trip.id)}
							<li class="rounded-[8px] bg-surface-container p-4">
								<div class="flex flex-wrap items-start justify-between gap-2">
									<p class="text-mono-data text-body font-semibold text-text">
										{view.trip.code}
										<span class="text-body-sm font-normal text-text-muted">
											{formatJourneyDate(view.trip.serviceDate, locale)}
										</span>
									</p>
									<TripStatusBadge status={view.trip.status} />
								</div>

								<dl class="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
									<div>
										<dt class="text-caps uppercase text-text-muted">{m.trip_route()}</dt>
										<dd class="text-body-sm font-semibold text-text">
											{placeName(view.route, locale)}
										</dd>
									</div>
									<div>
										<dt class="text-caps uppercase text-text-muted">{m.ops_column_time()}</dt>
										<dd class="text-mono-data text-body-sm text-text">
											{formatClock(view.trip.departureTime)} → {formatClock(view.trip.arrivalTime)}
										</dd>
									</div>
									<div>
										<dt class="text-caps uppercase text-text-muted">{m.trip_driver()}</dt>
										<dd class="text-mono-data text-body-sm text-text">
											{view.trip.driverId}
											{#if view.driver}
												<span class="block text-text-muted">{view.driver.name}</span>
											{/if}
										</dd>
									</div>
									<div>
										<dt class="text-caps uppercase text-text-muted">{m.trip_conductor()}</dt>
										<dd class="text-mono-data text-body-sm text-text">
											{view.trip.conductorId}
											{#if view.conductor}
												<span class="block text-text-muted">{view.conductor.name}</span>
											{/if}
										</dd>
									</div>
								</dl>
							</li>
						{/each}
					</ul>
				</li>
			{/each}
		</ul>
	{/if}
</div>
