<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BoardingTotals } from '$types/conductor';

	/**
	 * Boarding counters plus a progress bar.
	 *
	 * Counts only — no passenger identity is involved in any of these figures.
	 */

	interface Props {
		totals: BoardingTotals;
		capacity: number;
	}

	let { totals, capacity }: Props = $props();

	const percent = $derived(
		totals.booked === 0 ? 0 : Math.round((totals.boarded / totals.booked) * 100)
	);

	const tiles = $derived([
		{ label: m.conductor_stat_booked(), value: totals.booked, tone: 'text-text' },
		{ label: m.conductor_stat_boarded(), value: totals.boarded, tone: 'text-success' },
		{ label: m.conductor_stat_pending(), value: totals.pending, tone: 'text-warning' },
		{ label: m.conductor_stat_cancelled(), value: totals.cancelled, tone: 'text-danger' },
		{ label: m.conductor_stat_available(), value: totals.available, tone: 'text-text-muted' },
		{ label: m.conductor_stat_capacity(), value: capacity, tone: 'text-text-muted' }
	]);
</script>

<section
	class="rounded-card border border-border bg-surface p-4 shadow-level-1 md:p-6"
	aria-label={m.conductor_boarding_progress({ boarded: totals.boarded, booked: totals.booked })}
>
	<div class="flex flex-wrap items-baseline justify-between gap-2">
		<p class="text-title text-text">
			{m.conductor_boarding_progress({ boarded: totals.boarded, booked: totals.booked })}
		</p>
		<p class="text-mono-data text-title font-bold text-primary-soft-text">{percent}%</p>
	</div>

	<div
		class="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-container"
		role="progressbar"
		aria-valuenow={percent}
		aria-valuemin={0}
		aria-valuemax={100}
		aria-label={m.conductor_stat_boarded()}
	>
		<div class="h-full rounded-full bg-primary transition-all" style="width: {percent}%"></div>
	</div>

	<dl class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
		{#each tiles as tile (tile.label)}
			<div class="rounded-[8px] bg-surface-container px-3 py-2">
				<dt class="text-caps uppercase text-text-muted">{tile.label}</dt>
				<dd class="text-mono-data text-title font-semibold {tile.tone}">{tile.value}</dd>
			</div>
		{/each}
	</dl>
</section>
