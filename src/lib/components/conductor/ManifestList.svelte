<script lang="ts">
	import Badge from '$components/primitives/Badge.svelte';
	import Button from '$components/primitives/Button.svelte';
	import Icon from '$components/primitives/Icon.svelte';
	import * as m from '$lib/paraglide/messages';
	import type { ManifestEntry } from '$types/conductor';

	/**
	 * Bookings on the assigned service, by seat.
	 *
	 * PRIVACY: each row shows a seat, a booking reference, and a boarding
	 * status. There is no passenger name, age, gender, or contact detail —
	 * `ManifestEntry` has no field for any of them, so a crew device cannot
	 * display or leak them.
	 *
	 * Rendered as a definition-style card list rather than a table so it stays
	 * readable on a phone held at the door.
	 */

	interface Props {
		entries: ManifestEntry[];
		onmark: (pnr: string, next: 'boarded' | 'pending') => void;
		busyPnr?: string | null;
	}

	let { entries, onmark, busyPnr = null }: Props = $props();

	function statusLabel(entry: ManifestEntry): string {
		if (entry.ticketStatus === 'cancelled') return m.conductor_seat_state_cancelled();
		return entry.boardingStatus === 'boarded'
			? m.conductor_seat_state_boarded()
			: m.conductor_seat_state_pending();
	}

	function statusTone(entry: ManifestEntry) {
		if (entry.ticketStatus === 'cancelled') return 'danger' as const;
		return entry.boardingStatus === 'boarded' ? ('success' as const) : ('warning' as const);
	}
</script>

<ul class="flex flex-col gap-2">
	{#each entries as entry (entry.seatId)}
		<li
			class="flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface p-3
				shadow-level-1"
		>
			<span
				class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px]
					bg-surface-container"
			>
				<span class="text-mono-data text-[13px] font-bold text-text">{entry.seatId}</span>
			</span>

			<div class="min-w-0 flex-1">
				<p class="text-mono-data text-body-sm text-text">{entry.pnr}</p>
				<div class="mt-1 flex flex-wrap items-center gap-2">
					<Badge tone={statusTone(entry)} shape="pill">{statusLabel(entry)}</Badge>
					{#if entry.groupSize > 1}
						<Badge tone="neutral">{m.conductor_group_of({ count: entry.groupSize })}</Badge>
					{/if}
				</div>
			</div>

			{#if entry.ticketStatus === 'valid'}
				{#if entry.boardingStatus === 'pending'}
					<Button
						size="md"
						iconLeft="user-check"
						loading={busyPnr === entry.pnr}
						onclick={() => onmark(entry.pnr, 'boarded')}
					>
						{m.conductor_mark_boarded()}
					</Button>
				{:else}
					<Button
						size="md"
						variant="ghost"
						iconLeft="refresh"
						loading={busyPnr === entry.pnr}
						onclick={() => onmark(entry.pnr, 'pending')}
					>
						{m.conductor_mark_pending()}
					</Button>
				{/if}
			{:else}
				<span class="flex items-center gap-1.5 px-2 text-body-sm text-text-faint">
					<Icon name="close" size={16} />
					{m.conductor_seat_state_cancelled()}
				</span>
			{/if}
		</li>
	{/each}
</ul>
