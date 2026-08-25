<script lang="ts">
	import BoardingSeatMap from '$components/conductor/BoardingSeatMap.svelte';
	import ManifestList from '$components/conductor/ManifestList.svelte';
	import SeatDetailPanel from '$components/conductor/SeatDetailPanel.svelte';
	import Button from '$components/primitives/Button.svelte';
	import EmptyState from '$components/primitives/EmptyState.svelte';
	import ErrorState from '$components/primitives/ErrorState.svelte';
	import Icon from '$components/primitives/Icon.svelte';
	import Skeleton from '$components/primitives/Skeleton.svelte';
	import * as m from '$lib/paraglide/messages';
	import { getManifest, markBoarded, markPending } from '$services/conductor.service';
	import { getSeatDeck } from '$services/seats.service';
	import { boarding } from '$stores/boarding.svelte';
	import { session } from '$stores/session.svelte';
	import { toasts } from '$stores/toast.svelte';
	import type { SeatDeck, SeatId } from '$types/booking';
	import type { AsyncState } from '$types/common';
	import type { ManifestEntry } from '$types/conductor';

	/**
	 * Passenger / boarding view.
	 *
	 * The coach plan is the primary tool: the whole vehicle fits on one screen,
	 * drawn the same way round as the traveller's seat map, so a conductor
	 * boards by tapping the seat in front of them rather than scrolling a list
	 * to find it. The list remains one tap away for anyone who would rather
	 * read rows, or who needs to scan booking references.
	 *
	 * PRIVACY: seat, booking reference, and boarding status only. No passenger
	 * name, age, gender, or contact detail is available to this screen — the
	 * manifest type has no field for them.
	 */

	type Filter = 'all' | 'pending' | 'boarded' | 'cancelled';
	type View = 'plan' | 'list';

	let deck = $state<SeatDeck | null>(null);
	let loadState = $state<AsyncState>('loading');
	let view = $state<View>('plan');
	let filter = $state<Filter>('pending');
	let selectedSeat = $state<SeatId | null>(null);
	let busyPnr = $state<string | null>(null);

	// Read straight from the store so a boarding change re-renders both the
	// plan and the list without another round trip.
	const entries = $derived(boarding.entries);

	async function load() {
		loadState = 'loading';
		const [manifestResult, deckResult] = await Promise.all([
			getManifest(),
			getSeatDeck('setc-ultra-deluxe-0830')
		]);
		if (manifestResult.status === 'error') {
			loadState = 'error';
			return;
		}
		deck = deckResult.status === 'ok' ? deckResult.data : null;
		loadState = 'ready';
	}

	$effect(() => {
		if (session.current?.role === 'conductor') load();
	});

	const views: { value: View; label: () => string; icon: 'bus' | 'clipboard' }[] = [
		{ value: 'plan', label: () => m.conductor_view_plan(), icon: 'bus' },
		{ value: 'list', label: () => m.conductor_view_list(), icon: 'clipboard' }
	];

	const filters: { value: Filter; label: () => string }[] = [
		{ value: 'pending', label: () => m.conductor_filter_pending() },
		{ value: 'boarded', label: () => m.conductor_filter_boarded() },
		{ value: 'cancelled', label: () => m.conductor_filter_cancelled() },
		{ value: 'all', label: () => m.conductor_filter_all() }
	];

	function matches(entry: ManifestEntry, value: Filter): boolean {
		if (value === 'all') return true;
		if (value === 'cancelled') return entry.ticketStatus === 'cancelled';
		if (entry.ticketStatus === 'cancelled') return false;
		return entry.boardingStatus === value;
	}

	const visible = $derived(entries.filter((entry) => matches(entry, filter)));

	const counts = $derived({
		pending: entries.filter((e) => matches(e, 'pending')).length,
		boarded: entries.filter((e) => matches(e, 'boarded')).length,
		cancelled: entries.filter((e) => matches(e, 'cancelled')).length,
		all: entries.length
	});

	const booked = $derived(entries.filter((e) => e.ticketStatus === 'valid').length);
	const percent = $derived(booked === 0 ? 0 : Math.round((counts.boarded / booked) * 100));

	/** The open seat's booking, or null for an unsold seat. */
	const selectedEntry = $derived(
		selectedSeat === null
			? null
			: (entries.find((entry) => entry.seatId === selectedSeat) ?? null)
	);

	/**
	 * Walking order down the coach: row by row, and within a row from the
	 * vehicle's right across to the kerb side.
	 *
	 * Derived from the deck rather than from the seat code, so it stays correct
	 * if a coach is ever laid out with different columns.
	 */
	const seatOrder = $derived.by(() => {
		const order = new Map<SeatId, number>();
		if (!deck) return order;
		const columns = [...deck.leftColumns, ...deck.rightColumns];
		for (const seat of deck.seats) {
			order.set(seat.id, seat.row * 100 + columns.indexOf(seat.column));
		}
		return order;
	});

	/** Seats still waiting to board, in walking order. */
	const pendingQueue = $derived(
		entries
			.filter((entry) => entry.ticketStatus === 'valid' && entry.boardingStatus === 'pending')
			.toSorted((a, b) => (seatOrder.get(a.seatId) ?? 0) - (seatOrder.get(b.seatId) ?? 0))
	);

	/**
	 * Steps to the next seat waiting to board, and wraps at the back of the
	 * coach.
	 *
	 * Stepping is by position rather than by list index, so it continues from
	 * wherever the conductor is standing even after the open seat has been
	 * marked boarded and left the queue.
	 */
	function stepToNextPending() {
		if (pendingQueue.length === 0) return;
		const from = selectedSeat === null ? -1 : (seatOrder.get(selectedSeat) ?? -1);
		const next =
			pendingQueue.find((entry) => (seatOrder.get(entry.seatId) ?? 0) > from) ?? pendingQueue[0];
		selectedSeat = next.seatId;
	}

	async function onmark(pnr: string, next: 'boarded' | 'pending') {
		busyPnr = pnr;
		const result = next === 'boarded' ? await markBoarded(pnr) : await markPending(pnr);
		busyPnr = null;
		if (result.status === 'ok') {
			toasts.show(
				next === 'boarded'
					? m.conductor_marked_boarded({ pnr })
					: m.conductor_marked_pending({ pnr }),
				next === 'boarded' ? 'success' : 'info'
			);
		}
	}

	function onselect(seatId: SeatId) {
		selectedSeat = selectedSeat === seatId ? null : seatId;
	}
</script>

<svelte:head>
	<title>{m.conductor_passengers_title()} — {m.app_name()}</title>
</svelte:head>

<div class="shell-width flex w-full flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
	<header class="flex flex-col gap-3">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div>
				<h2 class="text-headline-sm text-text md:text-headline">
					{m.conductor_passengers_title()}
				</h2>
				<p class="mt-1 text-body-sm text-text-muted">{m.conductor_passengers_subtitle()}</p>
			</div>

			<!-- Compact boarding progress, so the headline number is visible
			     without leaving the screen the conductor is working on. -->
			<div class="flex min-w-[180px] flex-col gap-1.5">
				<div class="flex items-baseline justify-between gap-3">
					<span class="text-body-sm text-text-muted">
						{m.conductor_boarding_progress({ boarded: counts.boarded, booked })}
					</span>
					<span class="text-mono-data text-body font-bold text-primary-soft-text">
						{percent}%
					</span>
				</div>
				<div
					class="h-2 w-full overflow-hidden rounded-full bg-surface-container"
					role="progressbar"
					aria-valuenow={percent}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-label={m.conductor_stat_boarded()}
				>
					<div class="h-full rounded-full bg-primary transition-all" style="width: {percent}%">
					</div>
				</div>
			</div>
		</div>

		<p class="flex items-start gap-2 text-body-sm text-text-muted">
			<span class="mt-0.5 shrink-0 text-primary-soft-text">
				<Icon name="shield" size={16} />
			</span>
			{m.conductor_passengers_privacy()}
		</p>
	</header>

	{#if loadState === 'loading'}
		<Skeleton width="100%" height="320px" radius="card" />
	{:else if loadState === 'error'}
		<ErrorState title={m.tracking_error_title()} body={m.tracking_error_body()} onRetry={load} />
	{:else}
		<!-- View switch: the plan is the working tool, the list is the fallback. -->
		<div
			class="flex w-max gap-1 rounded-full border border-border bg-surface-container p-1"
			role="group"
			aria-label={m.conductor_view_label()}
		>
			{#each views as option (option.value)}
				{@const active = view === option.value}
				<button
					type="button"
					aria-pressed={active}
					onclick={() => (view = option.value)}
					class="flex min-h-[44px] items-center gap-2 rounded-full px-4 text-body-sm font-semibold
						transition-colors
						{active
						? 'bg-surface text-text shadow-level-1'
						: 'text-text-muted hover:text-text'}"
				>
					<Icon name={option.icon} size={18} />
					{option.label()}
				</button>
			{/each}
		</div>

		{#if view === 'plan'}
			<div class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
				{#if deck}
					<BoardingSeatMap {deck} {entries} {selectedSeat} {onselect} />
				{/if}

				<div class="flex flex-col gap-4">
					<!--
						Below the sidebar breakpoint the open seat docks to the bottom of
						the screen as a sheet, above the mobile nav. Tapping a seat on a
						phone then puts the boarding action under the thumb straight away
						instead of sending the conductor scrolling past the coach to find
						it. The step control travels with it, so moving to the next seat
						never means dismissing the sheet first.
					-->
					<div
						class={selectedSeat === null
							? 'flex flex-col gap-4'
							: `fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-40 flex
								flex-col gap-3 border-t border-border bg-background px-4 pt-3 pb-3
								shadow-level-2 md:bottom-0 md:px-6 xl:static xl:z-auto xl:gap-4
								xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none`}
					>
						<SeatDetailPanel
							seatId={selectedSeat}
							entry={selectedEntry}
							busy={busyPnr !== null && busyPnr === selectedEntry?.pnr}
							{onmark}
							onclose={() => (selectedSeat = null)}
						/>

						{#if pendingQueue.length > 0}
							<Button
								variant="secondary"
								fullWidth
								iconLeft="arrow-right"
								onclick={stepToNextPending}
							>
								{m.conductor_next_pending_count({ count: pendingQueue.length })}
							</Button>
						{:else}
							<p
								class="flex items-center gap-2 rounded-card border border-border bg-success-soft
									px-4 py-3 text-body-sm text-success"
							>
								<Icon name="check" size={18} />
								{m.conductor_all_boarded()}
							</p>
						{/if}
					</div>

					{#if selectedSeat !== null}
						<!-- Keeps the docked sheet from covering the end of the plan. -->
						<div class="h-64 xl:hidden" aria-hidden="true"></div>
					{/if}
				</div>
			</div>
		{:else}
			<div class="flex flex-col gap-4">
				<div class="flex flex-wrap gap-2" role="group" aria-label={m.conductor_status_column()}>
					{#each filters as option (option.value)}
						{@const active = filter === option.value}
						<button
							type="button"
							aria-pressed={active}
							onclick={() => (filter = option.value)}
							class="flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-body-sm
								font-medium transition-colors
								{active
								? 'border-primary bg-primary-soft text-primary-soft-text'
								: 'border-border-strong bg-surface text-text hover:border-primary'}"
						>
							{option.label()}
							<span class="text-mono-data text-[11px] text-text-faint">
								{counts[option.value]}
							</span>
						</button>
					{/each}
				</div>

				<p class="sr-only" aria-live="polite">
					{visible.length === 1
						? m.conductor_manifest_count_one()
						: m.conductor_manifest_count({ count: visible.length })}
				</p>

				{#if visible.length === 0}
					<EmptyState
						title={m.conductor_empty_title()}
						body={m.conductor_empty_body()}
						icon="seat"
					/>
				{:else}
					<ManifestList entries={visible} {onmark} {busyPnr} />
				{/if}
			</div>
		{/if}
	{/if}
</div>
