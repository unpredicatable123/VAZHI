<script lang="ts">
	import EmptyState from '$components/primitives/EmptyState.svelte';
	import ErrorState from '$components/primitives/ErrorState.svelte';
	import Icon from '$components/primitives/Icon.svelte';
	import Skeleton from '$components/primitives/Skeleton.svelte';
	import LedgerSummary from '$components/account/LedgerSummary.svelte';
	import TransactionRow from '$components/account/TransactionRow.svelte';
	import * as m from '$lib/paraglide/messages';
	import { ledgerTotals, listTransactions } from '$services/transactions.service';
	import { session } from '$stores/session.svelte';
	import type { AsyncState } from '$types/common';
	import type { LedgerEntry } from '$types/booking';

	/**
	 * Transaction history.
	 *
	 * A statement, not a second copy of My Trips: every payment and every refund
	 * in one chronological run, with what it all comes to at the top. Journeys
	 * live at /trips; this page answers "what did I spend".
	 *
	 * The ledger is projected from the traveller's own booking documents in the
	 * browser — there is no transactions collection and nothing is written by
	 * opening this page.
	 */

	let entries = $state<LedgerEntry[]>([]);
	let loadState = $state<AsyncState>('loading');

	const totals = $derived(ledgerTotals(entries));

	async function load() {
		loadState = 'loading';
		const result = await listTransactions();
		if (result.status === 'error') {
			loadState = 'error';
			return;
		}
		entries = result.data;
		loadState = 'ready';
	}

	$effect(() => {
		if (session.current?.role === 'traveller') load();
	});
</script>

<svelte:head>
	<title>{m.txn_title()} — {m.app_name()}</title>
</svelte:head>

<div class="shell-width flex w-full flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
	<header>
		<h2 class="text-headline-sm text-text md:text-headline">{m.txn_title()}</h2>
		<p class="mt-1 text-body-sm text-text-muted">{m.txn_subtitle()}</p>
	</header>

	{#if loadState === 'loading'}
		<Skeleton width="100%" height="96px" radius="card" />
		<Skeleton width="100%" height="320px" radius="card" />
	{:else if loadState === 'error'}
		<ErrorState title={m.txn_error_title()} body={m.txn_error_body()} onRetry={load} />
	{:else if entries.length === 0}
		<EmptyState icon="payments" title={m.txn_empty_title()} body={m.txn_empty_body()} />
	{:else}
		<LedgerSummary {totals} />

		<ul class="flex flex-col gap-3">
			<li class="sr-only">{m.txn_list_caption()}</li>
			{#each entries as entry (entry.id)}
				<TransactionRow {entry} />
			{/each}
		</ul>
	{/if}

	<p
		class="flex items-start gap-2 rounded-[8px] border border-border bg-surface-container p-3
			text-body-sm text-text-muted"
	>
		<span class="mt-0.5 shrink-0 text-primary-soft-text"><Icon name="shield" size={16} /></span>
		{m.txn_sandbox_note()}
	</p>
</div>
