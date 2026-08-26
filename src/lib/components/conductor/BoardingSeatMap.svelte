<script>
import CoachGangway from '$components/coach/CoachGangway.svelte';
import CoachRail from '$components/coach/CoachRail.svelte';
import CoachShell from '$components/coach/CoachShell.svelte';
import * as m from '$lib/paraglide/messages';
import { seatBoardingState } from '$services/conductor.service';
import BoardingSeat from './BoardingSeat.svelte';
let { deck, entries, selectedSeat, onselect } = $props();
const rows = $derived(Array.from({ length: deck.rows }, (_, index) => index + 1));
/** Rows whose seats sit over a wheel arch, front and rear. */
const wheelRows = $derived([2, deck.rows - 2]);
const legend = ['boarded', 'pending', 'cancelled', 'available'];
const swatches = {
    boarded: 'border-primary bg-primary',
    pending: 'border-warning bg-warning-soft',
    cancelled: 'seat-hatch border-danger/50 bg-danger-soft',
    available: 'border-border-strong bg-surface'
};
function label(state) {
    return {
        boarded: m.conductor_seat_state_boarded(),
        pending: m.conductor_seat_state_pending(),
        cancelled: m.conductor_seat_state_cancelled(),
        available: m.conductor_seat_state_available()
    }[state];
}
/** Live counts, so the legend doubles as a tally of the coach. */
const counts = $derived(Object.fromEntries(legend.map((state) => [
    state,
    deck.seats.filter((seat) => seatBoardingState(seat.id, deck, entries) === state).length
])));
function seatAt(row, column) {
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
