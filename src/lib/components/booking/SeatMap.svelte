<script>
import CoachGangway from '$components/coach/CoachGangway.svelte';
import CoachRail from '$components/coach/CoachRail.svelte';
import CoachShell from '$components/coach/CoachShell.svelte';
import * as m from '$lib/paraglide/messages';
import { rowTraits, seatState, seatsInRow, zoneBands } from '$services/seats.service';
import SeatButton from './SeatButton.svelte';
let { deck, selected, recommended, onselect } = $props();
const rows = $derived(Array.from({ length: deck.rows }, (_, index) => index + 1));
const bands = $derived(zoneBands(deck));
/** Rows whose seats sit over a wheel arch, front and rear. */
const wheelRows = $derived([2, deck.rows - 2]);
/** Row column width plus the gap, used to place bands on the same grid. */
const COLUMN = 50;
function bandStyle(from, to) {
    return `margin-left:${(from - 1) * COLUMN}px;width:${(to - from + 1) * COLUMN - 6}px`;
}
</script>

<figure class="m-0 w-full">
	<figcaption class="sr-only">{m.seats_deck_label({ rows: deck.rows })}</figcaption>

	<CoachShell label={m.seats_deck_label({ rows: deck.rows })}>
		{#snippet floor()}
			<!-- Zone ruler: names the sections of the deck along its length. -->
			<div class="relative flex h-5 items-center" aria-hidden="true">
				{#each bands as band (band.id)}
					<span
						class="absolute flex h-4 items-center justify-center overflow-hidden rounded-full px-1
							text-[9px] whitespace-nowrap tracking-wide uppercase
							{band.id === 'entrance'
							? 'bg-primary-soft text-primary-soft-text'
							: 'bg-accent-soft text-primary-soft-text'}"
						style={bandStyle(band.fromRow, band.toRow)}
						title={band.id === 'entrance' ? m.seat_signal_entrance() : m.seat_signal_quieter()}
					>
						{band.id === 'entrance' ? m.seats_zone_entrance() : m.seats_zone_quieter()}
					</span>
				{/each}
			</div>

			<CoachRail {rows} {wheelRows} />

			<!-- Seat rows: A, B, aisle, C, D -->
			{#each deck.leftColumns as column (column)}
				<div class="flex gap-1.5">
					{#each rows as row (row)}
						{@const seat = seatsInRow(deck, row).find((entry) => entry.column === column)}
						{#if seat}
							<SeatButton
								{seat}
								state={seatState(seat, selected, recommended)}
								traits={rowTraits(deck, row)}
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
						{@const seat = seatsInRow(deck, row).find((entry) => entry.column === column)}
						{#if seat}
							<SeatButton
								{seat}
								state={seatState(seat, selected, recommended)}
								traits={rowTraits(deck, row)}
								{onselect}
							/>
						{/if}
					{/each}
				</div>
			{/each}

			<CoachRail {rows} {wheelRows} />
		{/snippet}
	</CoachShell>
</figure>
