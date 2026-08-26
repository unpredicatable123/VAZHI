<script>
import Icon from '$components/primitives/Icon.svelte';
import * as m from '$lib/paraglide/messages';
import { getLocale } from '$lib/paraglide/runtime';
import { formatFare } from '$utils/format';
let { fare, action, note, class: className = '' } = $props();
const locale = $derived(getLocale());
</script>

<section
	class={`rounded-card border border-border bg-surface p-4 shadow-level-1 md:p-6 ${className}`}
	aria-labelledby="fare-title"
>
	<h2 id="fare-title" class="border-b border-border pb-3 text-title text-text">
		{m.fare_title()}
	</h2>

	<dl class="mt-3 flex flex-col gap-2">
		<div class="flex items-baseline justify-between gap-4">
			<dt class="text-body-sm text-text-muted">
				{fare.passengerCount === 1
					? m.fare_base_for_one()
					: m.fare_base_for({ count: fare.passengerCount })}
			</dt>
			<dd class="text-mono-data text-body-sm text-text">{formatFare(fare.baseFare, locale)}</dd>
		</div>

		<div class="flex items-baseline justify-between gap-4">
			<dt class="text-body-sm text-text-muted">{m.fare_taxes()}</dt>
			<dd class="text-mono-data text-body-sm text-text">{formatFare(fare.taxes, locale)}</dd>
		</div>

		{#if fare.concessionRequested}
			<!-- Concessions are verified with ID at boarding, so no amount is
			     deducted at booking time. -->
			<div class="flex items-baseline justify-between gap-4">
				<dt class="text-body-sm text-primary-soft-text">{m.fare_concession()}</dt>
				<dd class="text-body-sm text-primary-soft-text">{m.fare_concession_value()}</dd>
			</div>
		{/if}

		<div class="mt-1 flex items-baseline justify-between gap-4 border-t border-border pt-3">
			<dt class="text-title text-text">{m.fare_total()}</dt>
			<dd class="text-mono-data text-title font-bold text-primary-soft-text">
				{formatFare(fare.total, locale)}
			</dd>
		</div>
	</dl>

	<p class="mt-1 text-right text-caps uppercase text-text-faint">{m.fare_inclusive()}</p>

	{#if note}
		<p class="mt-4 flex items-start gap-2 rounded-[8px] bg-surface-container p-3 text-body-sm
			text-text-muted">
			<span class="mt-0.5 shrink-0 text-primary-soft-text"><Icon name="info" size={18} /></span>
			{note}
		</p>
	{/if}

	{#if action}
		<div class="mt-4">{@render action()}</div>
	{/if}
</section>
