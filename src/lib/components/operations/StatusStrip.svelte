<script lang="ts">
	import Icon from '$components/primitives/Icon.svelte';
	import * as m from '$lib/paraglide/messages';
	import type { TripStatus, TripStatusCounts } from '$types/fleet';
	import { tripStatusLabel, tripStatusTone, type Tone } from '$utils/trip-status';

	/**
	 * The day's trip states, as one strip.
	 *
	 * These used to be six separate bordered cards, each with its own shadow,
	 * sitting above four more of the same for the fleet totals. Ten boxes
	 * competing for attention before a controller reached the board they
	 * actually work from — the counts read as ten unrelated facts rather than
	 * as one distribution.
	 *
	 * One panel with hairline dividers reads as a single summary that happens
	 * to be split into columns, which is what it is. The live count leads and
	 * is the only cell allowed a tint; the rest are a row of numbers to scan.
	 *
	 * EVERY CELL IS A LINK. A count you cannot open is a dead end — seeing
	 * "Completed 5" and having no way to ask *which five* is the wrong place to
	 * stop. Each cell opens the board already narrowed to that status, and
	 * scoped to today, so the number on the tile is exactly the number of rows
	 * that arrive. Anything else would be a summary that disagrees with the
	 * thing it summarises.
	 */

	interface Props {
		counts: TripStatusCounts;
		/** Runnings that are boarding, departed, or in transit right now. */
		active: number;
		/** Where the whole board lives. */
		href: string;
	}

	let { counts, active, href }: Props = $props();

	/**
	 * Opens the board narrowed to one status and scoped to today, so the count
	 * on the cell matches the rows that arrive.
	 */
	function boardHref(filter: string): string {
		return `${href}?status=${filter}&day=today`;
	}

	const statuses: TripStatus[] = [
		'scheduled',
		'boarding',
		'in-transit',
		'completed',
		'cancelled'
	];

	const accents: Record<Tone, string> = {
		neutral: 'text-text-muted',
		primary: 'text-primary-soft-text',
		accent: 'text-primary-soft-text',
		success: 'text-success',
		warning: 'text-warning',
		danger: 'text-danger'
	};
</script>

<div
	class="grid grid-cols-2 overflow-hidden rounded-card border border-border bg-surface
		shadow-level-1 sm:grid-cols-3 lg:grid-cols-6"
>
	<!--
		Active now leads: it is the only number a controller acts on, so it gets
		the tint and the link through to the board. Everything after it is
		context.
	-->
	<a
		href={boardHref('active')}
		class="group flex flex-col gap-1 border-r border-b border-border bg-primary-soft p-4
			transition-colors last:border-r-0 hover:bg-primary-soft/70 sm:border-b-0"
	>
		<span class="flex items-center gap-1.5 text-caps uppercase text-primary-soft-text">
			<Icon name="bolt" size={14} />
			{m.ops_stat_active()}
		</span>
		<span class="text-mono-data text-headline-sm font-bold text-text">{active}</span>
	</a>

	{#each statuses as status, index (status)}
		<a
			href={boardHref(status)}
			class="flex flex-col gap-1 border-border p-4 transition-colors
				hover:bg-surface-container
				{index < statuses.length - 1 ? 'border-r' : ''}
				{index < 3 ? 'border-b sm:border-b-0' : ''}"
		>
			<span class="flex items-center gap-1.5 text-caps uppercase text-text-muted">
				<span class={accents[tripStatusTone(status)]}>
					<Icon
						name={status === 'scheduled'
							? 'calendar'
							: status === 'boarding'
								? 'user-check'
								: status === 'in-transit'
									? 'route'
									: status === 'completed'
										? 'check'
										: 'close'}
						size={14}
					/>
				</span>
				{tripStatusLabel(status)}
			</span>
			<span
				class="text-mono-data text-headline-sm font-bold
					{counts[status] === 0 ? 'text-text-faint' : 'text-text'}"
			>
				{counts[status]}
			</span>
		</a>
	{/each}
</div>
