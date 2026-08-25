<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$components/primitives/Button.svelte';
	import ErrorState from '$components/primitives/ErrorState.svelte';
	import Skeleton from '$components/primitives/Skeleton.svelte';
	import TripTable from '$components/operations/TripTable.svelte';
	import * as m from '$lib/paraglide/messages';
	import {
		listTripViews,
		matchesBoardFilter,
		matchesBoardScope,
		parseBoardFilter,
		parseBoardScope
	} from '$services/trips.service';
	import type { BoardFilter, BoardScope } from '$services/trips.service';
	import { session } from '$stores/session.svelte';
	import type { AsyncState } from '$types/common';
	import type { TripView } from '$types/fleet';
	import { tripStatuses } from '$types/fleet';
	import { tripStatusLabel } from '$utils/trip-status';

	/**
	 * Trip management — the whole schedule, filterable by state.
	 *
	 * The board runs across dates on purpose. Reading yesterday's completed
	 * running, today's live ones, and next week's Salem → Bangalore in one list is
	 * how a controller sees that a vehicle is not tied to a corridor: TN 01 AN
	 * 1234 appears against two different routes on two different dates, a few
	 * rows apart.
	 */

	/*
		The filter and the date scope both live in the URL.

		The dashboard's status strip links straight in here — "Completed 5" opens
		the board already showing those five — so the state it arrives with has to
		be readable from the address. Keeping it there also makes a narrowed board
		shareable and the back button meaningful.
	*/
	let views = $state<TripView[]>([]);
	let loadState = $state<AsyncState>('loading');

	const filter = $derived(parseBoardFilter(page.url.searchParams.get('status')));
	const scope = $derived(parseBoardScope(page.url.searchParams.get('day')));

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

	const filters: BoardFilter[] = ['all', 'active', ...tripStatuses];

	/** The rows the current date scope allows, before the status filter. */
	const inScope = $derived(views.filter((view) => matchesBoardScope(view.trip, scope)));

	function countFor(value: BoardFilter): number {
		return inScope.filter((view) => matchesBoardFilter(view.trip, value)).length;
	}

	function labelFor(value: BoardFilter): string {
		if (value === 'all') return m.ops_filter_all();
		if (value === 'active') return m.ops_filter_active();
		return tripStatusLabel(value);
	}

	const shown = $derived(inScope.filter((view) => matchesBoardFilter(view.trip, filter)));

	/** Rewrites the address rather than holding the state locally. */
	function apply(next: { status?: BoardFilter; day?: BoardScope }) {
		const params = new URLSearchParams(page.url.searchParams);
		const status = next.status ?? filter;
		const day = next.day ?? scope;

		if (status === 'all') params.delete('status');
		else params.set('status', status);

		if (day === 'all') params.delete('day');
		else params.set('day', day);

		const query = params.toString();
		goto(query ? `?${query}` : page.url.pathname, {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});
	}
</script>

<svelte:head>
	<title>{m.ops_trips_title()} — {m.app_name()}</title>
</svelte:head>

<div class="shell-width flex w-full flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
	<header class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h2 class="text-headline-sm text-text md:text-headline">{m.ops_trips_title()}</h2>
			<p class="mt-1 text-body-sm text-text-muted">{m.ops_trips_subtitle()}</p>
		</div>
		<Button href="/operations/trips/new" iconLeft="plus">{m.ops_create_trip()}</Button>
	</header>

	{#if loadState === 'loading'}
		<div class="flex flex-col gap-4" aria-busy="true">
			<Skeleton width="100%" height="48px" radius="card" />
			<Skeleton width="100%" height="360px" radius="card" />
		</div>
	{:else if loadState === 'error'}
		<ErrorState title={m.ops_error_title()} body={m.ops_error_body()} onRetry={load} />
	{:else}
		<!--
			Date scope. The dashboard links in scoped to today so its counts match
			the rows that arrive; this is how a controller widens to the whole
			schedule again.
		-->
		<div
			class="inline-flex self-start rounded-full border border-border bg-surface-container p-0.5"
			role="radiogroup"
			aria-label={m.ops_scope_label()}
		>
			{#each ['today', 'all'] as const as option (option)}
				{@const active = scope === option}
				<button
					type="button"
					role="radio"
					aria-checked={active}
					onclick={() => apply({ day: option })}
					class="flex min-h-[44px] items-center gap-2 rounded-full px-4 text-body-sm
						font-semibold whitespace-nowrap transition-colors
						{active ? 'bg-surface text-text shadow-level-1' : 'text-text-muted hover:text-text'}"
				>
					{option === 'today' ? m.ops_scope_today() : m.ops_scope_all()}
					<span class="text-mono-data text-caps text-text-muted">
						{views.filter((view) => matchesBoardScope(view.trip, option)).length}
					</span>
				</button>
			{/each}
		</div>

		<!-- Status filters. A group of toggles rather than a select, so the
		     distribution of the day is readable without opening anything. -->
		<div role="group" aria-label={m.ops_filter_label()} class="flex flex-wrap gap-2">
			{#each filters as value (value)}
				{@const active = filter === value}
				<button
					type="button"
					onclick={() => apply({ status: value })}
					aria-pressed={active}
					class="flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-body-sm
						font-semibold transition-colors
						{active
						? 'border-primary bg-primary-soft text-primary-soft-text'
						: 'border-border bg-surface text-text-muted hover:border-primary/50 hover:text-text'}"
				>
					{labelFor(value)}
					<span class="text-mono-data text-caps">{countFor(value)}</span>
				</button>
			{/each}
		</div>

		<TripTable views={shown} />
	{/if}
</div>
