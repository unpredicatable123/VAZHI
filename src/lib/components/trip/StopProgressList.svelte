<script lang="ts">
	import Icon from '$components/primitives/Icon.svelte';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import type { TripStopProgress } from '$types/fleet';
	import type { Locale } from '$types/preferences';
	import { formatClock, placeName } from '$utils/format';

	/**
	 * The running order of a route, with progress marked on it.
	 *
	 * Drawn as a vertical line with a node per stop, the same idiom the
	 * traveller-side tracking stepper uses, so the two screens read as one
	 * product. The current stop is the only one that carries weight, because
	 * on a moving bus that is the single thing worth finding at a glance.
	 *
	 * SIMULATION. Progress is derived from the trip status and the scheduled
	 * times in the browser. No GPS or telemetry feed is involved.
	 */

	interface Props {
		stops: TripStopProgress[];
		class?: string;
	}

	let { stops, class: className = '' }: Props = $props();

	const locale = $derived(getLocale() as Locale);

	function stateLabel(state: TripStopProgress['state']): string {
		if (state === 'completed') return m.stop_state_completed();
		if (state === 'current') return m.stop_state_current();
		return m.stop_state_upcoming();
	}
</script>

<ol class={`flex flex-col ${className}`}>
	{#each stops as entry, index (entry.stop.stopId)}
		{@const isLast = index === stops.length - 1}
		<li class="flex gap-3">
			<!-- Node and connector. Decorative: the state is named in text below. -->
			<div class="flex w-6 shrink-0 flex-col items-center" aria-hidden="true">
				{#if entry.state === 'current'}
					<span
						class="flex h-6 w-6 items-center justify-center rounded-full bg-primary
							text-on-primary ring-4 ring-primary/20"
					>
						<Icon name="bus" size={14} strokeWidth={2} />
					</span>
				{:else if entry.state === 'completed'}
					<span
						class="flex h-6 w-6 items-center justify-center rounded-full bg-success-soft
							text-success"
					>
						<Icon name="check" size={14} strokeWidth={2.4} />
					</span>
				{:else}
					<span class="mt-1.5 h-3 w-3 rounded-full border-2 border-border-strong bg-surface"
					></span>
				{/if}

				{#if !isLast}
					<span
						class="mt-1 w-0.5 flex-1 {entry.state === 'completed'
							? 'bg-success/40'
							: 'bg-border'}"
					></span>
				{/if}
			</div>

			<div class="flex min-w-0 flex-1 items-baseline justify-between gap-3 {isLast ? '' : 'pb-5'}">
				<div class="min-w-0">
					<p
						class="truncate text-body {entry.state === 'current'
							? 'font-bold text-text'
							: entry.state === 'completed'
								? 'text-text-muted'
								: 'text-text'}"
					>
						{placeName(entry.stop, locale)}
					</p>
					<p class="text-caps uppercase text-text-faint">{stateLabel(entry.state)}</p>
				</div>
				<span class="text-mono-data shrink-0 text-body-sm text-text-muted">
					{formatClock(entry.time)}
				</span>
			</div>
		</li>
	{/each}
</ol>
