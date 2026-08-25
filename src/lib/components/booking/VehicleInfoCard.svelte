<script lang="ts">
	import Icon from '$components/primitives/Icon.svelte';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import type { Locale } from '$types/preferences';
	import type { BusResult, TransitStop } from '$types/transit';
	import { formatClock, placeName } from '$utils/format';

	/** Vehicle summary card from the Stitch seat-selection rail. */

	interface Props {
		bus: BusResult;
		originStop?: TransitStop;
		destinationStop?: TransitStop;
	}

	let { bus, originStop, destinationStop }: Props = $props();

	const locale = $derived(getLocale() as Locale);
</script>

<section
	class="flex gap-4 rounded-card border border-border bg-surface p-4 shadow-level-1"
	aria-label={m.vehicle_card_title()}
>
	<span
		class="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px]
			bg-surface-container text-text-muted"
	>
		<Icon name="bus" size={24} />
	</span>

	<div class="min-w-0 flex-1">
		<p class="text-mono-data text-[14px] font-semibold text-text">
			<span class="sr-only">{m.bus_vehicle_number()}: </span>{bus.vehicleNumber}
		</p>
		<p class="mt-0.5 text-body-sm text-text-muted">
			{bus.serviceName}, {bus.amenities.airConditioned ? m.bus_ac() : m.bus_non_ac()},
			{bus.amenities.seatLayout}
		</p>

		<p
			class="mt-2 inline-flex w-max items-center gap-2 rounded-[6px] bg-surface-container px-2
				py-1 text-text"
		>
			<Icon name="clock" size={14} class="text-text-muted" />
			<span class="text-mono-data text-[13px]">{formatClock(bus.departure)}</span>
			<Icon name="arrow-right" size={12} class="text-text-muted" />
			<span class="text-mono-data text-[13px]">{formatClock(bus.arrival)}</span>
		</p>

		{#if originStop && destinationStop}
			<p class="mt-2 text-body-sm text-text-muted">
				{placeName(originStop, locale)} → {placeName(destinationStop, locale)}
			</p>
		{/if}
		<p class="mt-1 text-body-sm text-text-muted">
			{m.review_platform({ platform: bus.boardingPlatform })}
		</p>
	</div>
</section>
