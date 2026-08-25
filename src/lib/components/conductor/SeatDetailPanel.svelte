<script lang="ts">
	import Badge from '$components/primitives/Badge.svelte';
	import Button from '$components/primitives/Button.svelte';
	import Icon from '$components/primitives/Icon.svelte';
	import * as m from '$lib/paraglide/messages';
	import type { SeatId } from '$types/booking';
	import type { ManifestEntry } from '$types/conductor';

	/**
	 * Details for the one seat the conductor has opened.
	 *
	 * Boarding is a two-step action on purpose: tapping a seat opens it, and a
	 * separate full-size button records the boarding. At a bus door a stray tap
	 * would otherwise mark a stranger as boarded, which is far more expensive to
	 * unpick than one extra press.
	 *
	 * PRIVACY: a seat, a booking reference, a status, and a group size. There is
	 * no name, age, gender, or contact detail here because `ManifestEntry` has
	 * no field for any of them.
	 */

	interface Props {
		seatId: SeatId | null;
		entry: ManifestEntry | null;
		busy: boolean;
		onmark: (pnr: string, next: 'boarded' | 'pending') => void;
		onclose: () => void;
	}

	let { seatId, entry, busy, onmark, onclose }: Props = $props();

	const statusLabel = $derived(
		entry === null
			? ''
			: entry.ticketStatus === 'cancelled'
				? m.conductor_seat_state_cancelled()
				: entry.boardingStatus === 'boarded'
					? m.conductor_seat_state_boarded()
					: m.conductor_seat_state_pending()
	);

	const statusTone = $derived(
		entry === null
			? ('neutral' as const)
			: entry.ticketStatus === 'cancelled'
				? ('danger' as const)
				: entry.boardingStatus === 'boarded'
					? ('success' as const)
					: ('warning' as const)
	);
</script>

<section
	class="rounded-card border border-border bg-surface p-4 shadow-level-1 md:p-6"
	aria-live="polite"
	aria-label={m.conductor_seat_column()}
>
	{#if seatId === null}
		<p class="flex items-center gap-2.5 text-body-sm text-text-muted">
			<span class="shrink-0 text-primary-soft-text"><Icon name="seat" size={20} /></span>
			{m.conductor_seat_detail_prompt()}
		</p>
	{:else}
		<div class="flex flex-wrap items-center gap-3">
			<span
				class="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] border-2
					border-border-strong bg-surface-container"
			>
				<span class="text-mono-data text-body font-bold text-text">{seatId}</span>
			</span>

			<div class="min-w-0 flex-1">
				<p class="text-title text-text">{m.conductor_seat_detail_title({ seat: seatId })}</p>
				{#if entry}
					<div class="mt-1 flex flex-wrap items-center gap-2">
						<Badge tone={statusTone} shape="pill">{statusLabel}</Badge>
						{#if entry.groupSize > 1}
							<Badge tone="neutral">{m.conductor_group_of({ count: entry.groupSize })}</Badge>
						{/if}
					</div>
				{:else}
					<p class="mt-1 text-body-sm text-text-muted">{m.conductor_seat_detail_unsold()}</p>
				{/if}
			</div>

			<button
				type="button"
				onclick={onclose}
				aria-label={m.conductor_seat_detail_close()}
				title={m.conductor_seat_detail_close()}
				class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] text-text-muted
					transition-colors hover:bg-surface-container hover:text-text"
			>
				<Icon name="close" size={20} />
			</button>
		</div>

		{#if entry}
			<dl class="mt-4 flex items-baseline justify-between gap-3 border-t border-border pt-3">
				<dt class="text-caps uppercase text-text-muted">{m.conductor_pnr_column()}</dt>
				<dd class="text-mono-data text-body font-semibold text-text">{entry.pnr}</dd>
			</dl>

			<div class="mt-4">
				{#if entry.ticketStatus !== 'valid'}
					<p class="flex items-center gap-2 text-body-sm text-text-faint">
						<Icon name="close" size={16} />
						{m.conductor_seat_state_cancelled()}
					</p>
				{:else if entry.boardingStatus === 'pending'}
					<Button
						size="lg"
						fullWidth
						iconLeft="user-check"
						loading={busy}
						onclick={() => onmark(entry.pnr, 'boarded')}
					>
						{m.conductor_mark_boarded()}
					</Button>
				{:else}
					<Button
						size="lg"
						fullWidth
						variant="secondary"
						iconLeft="refresh"
						loading={busy}
						onclick={() => onmark(entry.pnr, 'pending')}
					>
						{m.conductor_mark_pending()}
					</Button>
				{/if}
			</div>
		{/if}
	{/if}
</section>
