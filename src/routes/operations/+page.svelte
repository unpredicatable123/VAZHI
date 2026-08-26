<script lang="ts">
	import SandboxNotice from '$components/booking/SandboxNotice.svelte';
	import Button from '$components/primitives/Button.svelte';
	import ErrorState from '$components/primitives/ErrorState.svelte';
	import Icon from '$components/primitives/Icon.svelte';
	import Skeleton from '$components/primitives/Skeleton.svelte';
	import StatusStrip from '$components/operations/StatusStrip.svelte';
	import TripTable from '$components/operations/TripTable.svelte';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import { crewInRole } from '$services/crew.service';
	import { listBuses } from '$services/fleet.service';
	import { listRoutes, listTripViews, statusCounts } from '$services/trips.service';
	import { session } from '$stores/session.svelte';
	import type { AsyncState } from '$types/common';
	import type { TripStatusCounts, TripView } from '$types/fleet';
	import type { Locale } from '$types/preferences';
	import { formatJourneyDate, todayIso } from '$utils/format';

	/**
	 * Operations dashboard — today, at a glance.
	 *
	 * A transport control board, not a generic admin home: the counts across the
	 * top are trip states, because a controller's first question is how the day
	 * is running, and the board below is today's actual runnings in departure
	 * order. Fleet and roster totals sit underneath as the second question.
	 *
	 * Everything is read from the same trip records the crew workspaces read, so
	 * a status a driver set is on this board immediately.
	 */

	let views = $state<TripView[]>([]);
	let counts = $state<TripStatusCounts | null>(null);
	let busCount = $state(0);
	let routeCount = $state(0);
	let loadState = $state<AsyncState>('loading');

	const driverCount = crewInRole('driver').length;
	const conductorCount = crewInRole('conductor').length;

	async function load() {
		loadState = 'loading';
		const [tripResult, busResult, routeResult] = await Promise.all([
			listTripViews(),
			listBuses(),
			listRoutes()
		]);

		if (tripResult.status === 'error') {
			loadState = 'error';
			return;
		}

		views = tripResult.data;
		busCount = busResult.status === 'ok' ? busResult.data.length : 0;
		routeCount = routeResult.status === 'ok' ? routeResult.data.length : 0;
		loadState = 'ready';
	}

	$effect(() => {
		if (session.current?.role === 'operations') load();
	});

	const locale = $derived(getLocale() as Locale);
	const today = todayIso();
	const todaysViews = $derived(views.filter((view) => view.trip.serviceDate === today));

	$effect(() => {
		counts = statusCounts(todaysViews.map((view) => view.trip));
	});

	/**
	 * Fleet and roster totals, as links.
	 *
	 * Routes has no page of its own yet, so it renders as a plain count rather
	 * than a link that goes nowhere.
	 */
	const resourceLinks = $derived([
		{ href: '/operations/refunds', icon: 'payments' as const, label: (): string => 'Refund Approvals', value: '→' },
		{ href: '/operations/buses', icon: 'bus' as const, label: () => m.ops_nav_buses(), value: busCount },
		{
			href: '/operations/drivers',
			icon: 'steering' as const,
			label: () => m.ops_nav_drivers(),
			value: driverCount
		},
		{
			href: '/operations/conductors',
			icon: 'clipboard' as const,
			label: () => m.ops_nav_conductors(),
			value: conductorCount
		},
		{ href: undefined, icon: 'route' as const, label: () => m.ops_stat_routes(), value: routeCount }
	]);

	/** Anything not finished or called off is still live for the controller. */
	const activeCount = $derived(
		todaysViews.filter(
			(view) => view.trip.status === 'boarding' || view.trip.status === 'departed' || view.trip.status === 'in-transit'
		).length
	);
</script>

<svelte:head>
	<title>{m.ops_dashboard_title()} — {m.app_name()}</title>
</svelte:head>

<div class="shell-width flex w-full flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
	<header class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h2 class="text-headline-sm text-text md:text-headline">{m.ops_dashboard_title()}</h2>
			<p class="mt-1 text-body-sm text-text-muted">
				{m.ops_dashboard_subtitle({ date: formatJourneyDate(today, locale) })}
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			{#if session.current}
				<div
					class="flex items-center gap-2 rounded-[8px] border border-border bg-surface px-3 py-2"
				>
					<span class="text-primary-soft-text"><Icon name="hub" size={18} /></span>
					<span class="min-w-0">
						<span class="block text-caps uppercase text-text-muted">{m.ops_control_label()}</span>
						<span class="text-mono-data block text-body-sm text-text">{session.current.id}</span>
					</span>
				</div>
			{/if}
			<Button href="/operations/trips/new" iconLeft="plus">{m.ops_create_trip()}</Button>
		</div>
	</header>

	<SandboxNotice title={m.ops_simulated_title()} body={m.ops_simulated_body()} />

	{#if loadState === 'loading'}
		<div class="flex flex-col gap-4" aria-busy="true">
			<Skeleton width="100%" height="120px" radius="card" />
			<Skeleton width="100%" height="320px" radius="card" />
		</div>
	{:else if loadState === 'error' || !counts}
		<ErrorState title={m.ops_error_title()} body={m.ops_error_body()} onRetry={load} />
	{:else}
		<!-- The day at a glance: one strip, not ten competing cards. -->
		<StatusStrip {counts} active={activeCount} href="/operations/trips" />

		<!-- The board is the work, so it gets the room. -->
		<section aria-labelledby="ops-board-title" class="flex flex-col gap-3">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h3 id="ops-board-title" class="text-title text-text">{m.ops_board_title()}</h3>
				<Button href="/operations/trips" variant="ghost" iconRight="arrow-right">
					{m.ops_view_all_trips()}
				</Button>
			</div>
			<TripTable views={todaysViews} hideDate />
		</section>

		<!--
			Fleet and roster totals are navigation, not status — a controller goes
			to them, they are not something to watch. A slim row of links rather
			than four more cards competing with the board above.
		-->
		<nav aria-label={m.ops_resources_title()} class="flex flex-wrap items-center gap-2">
			{#each resourceLinks as link (link.href ?? link.label())}
				{#if link.href}
					<a
						href={link.href}
						class="flex min-h-[44px] items-center gap-2 rounded-full border border-border
							bg-surface px-3.5 text-body-sm text-text-muted transition-colors
							hover:border-primary hover:text-text"
					>
						<Icon name={link.icon} size={15} />
						{link.label()}
						<span class="text-mono-data text-caps text-text">{link.value}</span>
					</a>
				{:else}
					<span
						class="flex min-h-[44px] items-center gap-2 rounded-full border border-border
							bg-surface px-3.5 text-body-sm text-text-muted"
					>
						<Icon name={link.icon} size={15} />
						{link.label()}
						<span class="text-mono-data text-caps text-text">{link.value}</span>
					</span>
				{/if}
			{/each}
		</nav>
	{/if}
</div>
