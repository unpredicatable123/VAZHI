<script>
import Icon from '$components/primitives/Icon.svelte';
import * as m from '$lib/paraglide/messages';
import { tripStatusLabel, tripStatusTone } from '$utils/trip-status';
let { counts, active, href } = $props();
/**
 * Opens the board narrowed to one status and scoped to today, so the count
 * on the cell matches the rows that arrive.
 */
function boardHref(filter) {
    return `${href}?status=${filter}&day=today`;
}
const statuses = [
    'scheduled',
    'boarding',
    'in-transit',
    'completed',
    'cancelled'
];
const accents = {
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
