<script>
import Badge from '$components/primitives/Badge.svelte';
import Icon from '$components/primitives/Icon.svelte';
import * as m from '$lib/paraglide/messages';
import { getLocale } from '$lib/paraglide/runtime';
import { formatFare } from '$utils/format';
let { entry } = $props();
const locale = $derived(getLocale());
const isRefund = $derived(entry.kind === 'refund');
const amount = $derived(`${isRefund ? '+' : '−'}${formatFare(entry.amount, locale)}`);
const statusLabel = $derived({
    paid: m.txn_status_paid(),
    refund_pending: m.txn_status_refund_pending(),
    refunded: m.txn_status_refunded()
}[entry.status]);
const statusTone = $derived(entry.status === 'paid' ? 'success' : entry.status === 'refunded' ? 'neutral' : 'warning');
/** Statement lines carry a timestamp, so date and time both matter here. */
const when = $derived.by(() => {
    const parsed = new Date(entry.at);
    if (Number.isNaN(parsed.getTime()))
        return entry.at;
    return new Intl.DateTimeFormat(locale === 'ta' ? 'ta-IN' : 'en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(parsed);
});
</script>

<li
	class="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-level-1
		sm:flex-row sm:items-start sm:gap-4"
>
	<span
		class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full
			{isRefund ? 'bg-surface-container text-text-muted' : 'bg-primary-soft text-primary-soft-text'}"
		aria-hidden="true"
	>
		<Icon name={isRefund ? 'refresh' : 'payments'} size={20} />
	</span>

	<div class="min-w-0 flex-1">
		<p class="text-body font-semibold text-text">
			{entry.originName} → {entry.destinationName}
		</p>
		<p class="mt-0.5 text-body-sm text-text-muted">
			{isRefund ? m.txn_kind_refund() : m.txn_kind_payment()} · {entry.serviceName}
		</p>
		<p class="mt-1 text-body-sm text-text-muted">
			<span class="text-caps uppercase">{m.txn_reference()}</span>
			<span class="text-mono-data font-semibold text-text">{entry.pnr}</span>
		</p>
		<p class="mt-1 text-body-sm text-text-faint">
			{when}
			{#if entry.seatIds.length > 0}
				· {m.txn_seats()} <span class="text-mono-data">{entry.seatIds.join(', ')}</span>
			{/if}
			{#if entry.method}
				· {m.txn_method()} <span class="uppercase">{entry.method}</span>
			{/if}
		</p>

		<div class="mt-2 flex flex-wrap items-center gap-2">
			<Badge tone={statusTone}>{statusLabel}</Badge>
			{#if isRefund}
				<a
					class="inline-flex min-h-[44px] items-center text-body-sm font-semibold
						text-primary-soft-text underline-offset-2 hover:underline"
					href={`/refund/RF-${entry.pnr.replace(/^VZ-/, '')}`}
				>
					{m.txn_track_refund()}
				</a>
			{:else}
				<a
					class="inline-flex min-h-[44px] items-center text-body-sm font-semibold
						text-primary-soft-text underline-offset-2 hover:underline"
					href={`/ticket/${entry.pnr}`}
				>
					{m.txn_view_ticket()}
				</a>
			{/if}
		</div>
	</div>

	<p
		class="text-mono-data shrink-0 text-title font-semibold tabular-nums sm:text-right
			{isRefund ? 'text-success' : 'text-text'}"
	>
		{amount}
	</p>
</li>
