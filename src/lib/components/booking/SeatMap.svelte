<script lang="ts">
	import CoachGangway from '$components/coach/CoachGangway.svelte';
	import CoachRail from '$components/coach/CoachRail.svelte';
	import CoachShell from '$components/coach/CoachShell.svelte';
	import * as m from '$lib/paraglide/messages';
	import { rowTraits, seatState, seatsInRow, zoneBands } from '$services/seats.service';
	import type { SeatDeck, SeatId } from '$types/booking';
	import SeatButton from './SeatButton.svelte';

	/**
	 * The 2+2 deck, drawn as a coach floor plan rather than a grid of chips.
	 *
	 * Read as a plan view from above with the front of the bus on the left, so
	 * the layout tells you things a legend otherwise has to:
	 *
	 *  - the glazed rails along the top and bottom edges make window seats
	 *    self-evident, and the aisle floor runs down the middle;
	 *  - the driver's cabin sits front-right of the vehicle and the boarding
	 *    door front-left, which is the kerb side in Tamil Nadu, so "near the
	 *    entrance" is a position rather than a colour;
	 *  - wheel arches interrupt the rails where they really do on a coach;
	 *  - the zone ruler names the entrance and quieter sections along the deck.
	 *
	 * The chassis itself comes from `CoachShell`, shared with the conductor's
	 * boarding plan so both screens show the same vehicle.
	 *
	 * Column A sits on the vehicle's right, D on the kerb side by the door.
	 */

	interface Props {
		deck: SeatDeck;
		selected: SeatId[];
		recommended: SeatId[];
		onselect: (seatId: SeatId) => void;
	}

	let { deck, selected, recommended, onselect }: Props = $props();

	const rows = $derived(Array.from({ length: deck.rows }, (_, index) => index + 1));
	const bands = $derived(zoneBands(deck));

	/** Rows whose seats sit over a wheel arch, front and rear. */
	const wheelRows = $derived([2, deck.rows - 2]);

	/** Row column width plus the gap, used to place bands on the same grid. */
	const COLUMN = 50;

	function bandStyle(from: number, to: number): string {
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
