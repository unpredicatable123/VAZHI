<script>
import Icon from '$components/primitives/Icon.svelte';
import * as m from '$lib/paraglide/messages';
import { berthRows } from '$services/deck.service';
import { rowTraits, seatState, seatsInRow } from '$services/seats.service';
import BerthButton from './BerthButton.svelte';
let { deck, selected, recommended, onselect } = $props();
const tiers = [
    { level: 'lower', label: () => m.sleeper_lower_deck(), hint: () => m.sleeper_lower_hint() },
    { level: 'upper', label: () => m.sleeper_upper_deck(), hint: () => m.sleeper_upper_hint() }
];
/** Berths on one tier, grouped into the columns either side of the aisle. */
function tierRows(level) {
    return berthRows(deck, level);
}
function freeOnTier(level) {
    return deck.seats.filter((seat) => seat.berth === level && seat.availability === 'available').length;
}
</script>

<figure class="m-0 flex w-full flex-col gap-4 lg:flex-row lg:items-start lg:justify-center">
	<figcaption class="sr-only">{m.sleeper_plan_label()}</figcaption>

	{#each tiers as tier (tier.level)}
		{@const rows = tierRows(tier.level)}
		{#if rows.length > 0}
			<section
				class="flex min-w-0 flex-col gap-2 rounded-card border border-border bg-surface p-3
					shadow-level-1 lg:flex-1"
				aria-label={tier.label()}
			>
				<header class="flex flex-wrap items-center justify-between gap-2">
					<h3 class="flex items-center gap-2 text-body font-semibold text-text">
						<span class="text-primary-soft-text">
							<Icon name={tier.level === 'lower' ? 'seat' : 'bolt'} size={18} />
						</span>
						{tier.label()}
					</h3>
					<span class="text-mono-data text-caps text-text-muted">
						{m.sleeper_berths_free({ count: freeOnTier(tier.level) })}
					</span>
				</header>

				<p class="text-body-sm text-text-muted">{tier.hint()}</p>

				<!-- One canvas per tier. Front of the bus on the left, as on the
				     seater plan, so both read as the same vehicle. -->
				<div class="w-full overflow-x-auto pb-1">
					<div
						class="relative mx-auto flex w-max flex-col gap-1.5 rounded-l-[40px] rounded-r-card
							border-2 border-border-strong bg-surface-container p-2"
					>
						<span
							class="absolute top-1/2 left-1 -translate-y-1/2 -rotate-90 text-[9px]
								tracking-wide text-text-faint uppercase"
							aria-hidden="true"
						>
							{m.seats_front()}
						</span>

						<div class="flex flex-col gap-1.5 pl-6">
							{#each deck.leftColumns as column (column)}
								<div class="flex gap-1.5">
									{#each rows as row (row)}
										{@const seat = seatsInRow(deck, row).find(
											(entry) => entry.column === column
										)}
										{#if seat}
											<BerthButton
												{seat}
												state={seatState(seat, selected, recommended)}
												traits={rowTraits(deck, row)}
												{onselect}
											/>
										{/if}
									{/each}
								</div>
							{/each}

							<!-- Gangway between the double and single berths. -->
							<div class="my-1 h-4 rounded-full bg-surface" aria-hidden="true"></div>

							{#each deck.rightColumns as column (column)}
								<div class="flex gap-1.5">
									{#each rows as row (row)}
										{@const seat = seatsInRow(deck, row).find(
											(entry) => entry.column === column
										)}
										{#if seat}
											<BerthButton
												{seat}
												state={seatState(seat, selected, recommended)}
												traits={rowTraits(deck, row)}
												{onselect}
											/>
										{/if}
									{/each}
								</div>
							{/each}
						</div>
					</div>
				</div>
			</section>
		{/if}
	{/each}
</figure>
