<script>
import * as m from '$lib/paraglide/messages';
import { getLocale } from '$lib/paraglide/runtime';
import { formatFare } from '$utils/format';
let { totals } = $props();
const locale = $derived(getLocale());
const cells = $derived([
    { label: m.txn_total_net(), value: formatFare(totals.net, locale), lead: true },
    { label: m.txn_total_paid(), value: formatFare(totals.paid, locale), lead: false },
    { label: m.txn_total_refunded(), value: formatFare(totals.refunded, locale), lead: false },
    { label: m.txn_total_bookings(), value: String(totals.bookings), lead: false }
]);
</script>

<dl
	class="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border
		bg-border sm:grid-cols-4"
>
	{#each cells as cell (cell.label)}
		<div class="flex flex-col gap-1 bg-surface p-4">
			<dt class="text-caps uppercase text-text-muted">{cell.label}</dt>
			<dd
				class="text-mono-data tabular-nums {cell.lead
					? 'text-headline-sm text-primary-soft-text'
					: 'text-title text-text'}"
			>
				{cell.value}
			</dd>
		</div>
	{/each}
</dl>
