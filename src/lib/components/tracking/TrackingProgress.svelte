<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { TrackingStop } from '$types/booking';

	/**
	 * Vertical journey stepper.
	 *
	 * Departed stops are solid, the next stop pulses, and later stops are
	 * outlined — the progress-stepper rules from the design system. The pulse
	 * is suppressed under reduced motion by the global stylesheet.
	 */

	interface Props {
		stops: TrackingStop[];
		etaArrival: string;
	}

	let { stops, etaArrival }: Props = $props();


	function detailFor(stop: TrackingStop, index: number): string {
		if (index === stops.length - 1) return m.tracking_stop_destination({ time: etaArrival });
		if (stop.state === 'departed') return m.tracking_stop_departed({ time: stop.time });
		if (stop.state === 'next') return m.tracking_stop_next({ time: stop.time });
		return m.tracking_stop_upcoming({ time: stop.time });
	}
</script>

<ol class="relative flex flex-col">
	{#each stops as stop, index (stop.stopId)}
		{@const isLast = index === stops.length - 1}
		<li class="relative flex gap-4 {isLast ? '' : 'pb-6'}">
			{#if !isLast}
				<span
					class="absolute top-4 left-[7px] h-full w-0.5 {stop.state === 'departed'
						? 'bg-primary'
						: 'bg-border'}"
					aria-hidden="true"
				></span>
			{/if}

			<span
				class="relative z-10 mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full
					border-2
					{stop.state === 'departed'
					? 'border-primary bg-primary'
					: stop.state === 'next'
						? 'border-primary bg-surface'
						: 'border-border-strong bg-surface'}"
				aria-hidden="true"
			>
				{#if stop.state === 'next'}
					<span class="h-1.5 w-1.5 animate-pulse rounded-full bg-primary"></span>
				{/if}
			</span>

			<div class="min-w-0 flex-1">
				<p
					class="text-body font-semibold {stop.state === 'next'
						? 'text-primary-soft-text'
						: stop.state === 'departed'
							? 'text-text'
							: 'text-text-muted'}"
				>
					{stop.name}
				</p>
				<p class="text-body-sm text-text-muted">
					{detailFor(stop, index)}
				</p>
			</div>
		</li>
	{/each}
</ol>
