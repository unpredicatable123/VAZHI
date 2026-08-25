<script lang="ts">
	import CoachGangway from '$components/coach/CoachGangway.svelte';
	import CoachRail from '$components/coach/CoachRail.svelte';
	import CoachShell from '$components/coach/CoachShell.svelte';
	import * as m from '$lib/paraglide/messages';
	import { seatBoardingState } from '$services/conductor.service';
	import type { SeatDeck, SeatId } from '$types/booking';
	import type { ManifestEntry, SeatBoardingState } from '$types/conductor';
	import BoardingSeat from './BoardingSeat.svelte';

	/**
	 * Operational coach view.
	 *
	 * The same chassis the traveller books against — front cab on the left,
	 * glazed rails down both sides, gangway through the middle — so a
	 * conductor walking the aisle is looking at the plan the right way round
	 * and a seat is where the plan says it is.
	 *
	 * The whole coach fits on one screen, which is the point: boarding is done
	 * by tapping the seat in front of you, not by scrolling a list to find it.
	 *
	 * PRIVACY: seats carry a status colour and a seat code only. No identity,
	 * and no booking reference on the face of the plan.
	 */

	interface Props {
		deck: SeatDeck;
		entries: ManifestEntry[];
		/** The seat whose details are open, if any. */
		selectedSeat: SeatId | null;
		onselect: (seatId: SeatId) => void;
	}

	let { deck, entries, selectedSeat, onselect }: Props = $props();

	const rows = $derived(Array.from({ length: deck.rows }, (_, index) => index + 1));

	/** Rows whose seats sit over a wheel arch, front and rear. */
	const wheelRows = $derived([2, deck.rows - 2]);

	const legend: SeatBoardingState[] = ['boarded', 'pending', 'cancelled', 'available'];

	const swatches: Record<SeatBoardingState, string> = {
		boarded: 'border-primary bg-primary',
		pending: 'border-warning bg-warning-soft',
		cancelled: 'seat-hatch border-danger/50 bg-danger-soft',
		available: 'border-border-strong bg-surface'
	};

	function label(state: SeatBoardingState): string {
		return {
			boarded: m.conductor_seat_state_boarded(),
			pending: m.conductor_seat_state_pending(),
			cancelled: m.conductor_seat_state_cancelled(),
			available: m.conductor_seat_state_available()
		}[state];
	}

	/** Live counts, so the legend doubles as a tally of the coach. */
	const counts = $derived(
		Object.fromEntries(
			legend.map((state) => [
				state,
				deck.seats.filter((seat) => seatBoardingState(seat.id, deck, entries) === state).length
			])
		) as Record<SeatBoardingState, number>
	);

	function seatAt(row: number, column: string) {
		return deck.seats.find((seat) => seat.row === row && seat.column === column);
	}
</script>

<section
	class="rounded-card border border-border bg-surface p-4 shadow-level-1 md:p-6"
	aria-labelledby="boarding-map-title"
>
	<div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
		<h3 id="boarding-map-title" class="text-title text-text">{m.conductor_seatmap_title()}</h3>
		<p class="text-body-sm text-text-muted">{m.conductor_seatmap_hint()}</p>
	</div>
	<p class="mt-1 text-body-sm text-text-muted">{m.conductor_seatmap_subtitle()}</p>

	<ul class="mt-4 flex flex-wrap gap-x-4 gap-y-2">
		{#each legend as state (state)}
			<li class="flex items-center gap-2">
				<span class="h-4 w-4 rounded-[4px] border-2 {swatches[state]}" aria-hidden="true"></span>
				<span class="text-caps uppercase text-text-muted">{label(state)}</span>
				<span class="text-mono-data text-[11px] font-semibold text-text">{counts[state]}</span>
			</li>
		{/each}
	</ul>

	<div class="mt-5">
		<CoachShell label={m.conductor_seatmap_title()}>
			{#snippet floor()}
				<CoachRail {rows} {wheelRows} />

				{#each deck.leftColumns as column (column)}
					<div class="flex gap-1.5">
						{#each rows as row (row)}
							{@const seat = seatAt(row, column)}
							{#if seat}
								<BoardingSeat
									seatId={seat.id}
									boardingState={seatBoardingState(seat.id, deck, entries)}
									selected={selectedSeat === seat.id}
									{onselect}
								/>
							{/if}
						{/each}
					</div>
				{/each}

				<CoachGangway {rows} />

				{#each deck.rightColumns as column (column)}
					<div class="flex gap-1.5">
						{#each rows as row (row)}
							{@const seat = seatAt(row, column)}
							{#if seat}
								<BoardingSeat
									seatId={seat.id}
									boardingState={seatBoardingState(seat.id, deck, entries)}
									selected={selectedSeat === seat.id}
									{onselect}
								/>
							{/if}
						{/each}
					</div>
				{/each}

				<CoachRail {rows} {wheelRows} />
			{/snippet}
		</CoachShell>
	</div>
</section>
