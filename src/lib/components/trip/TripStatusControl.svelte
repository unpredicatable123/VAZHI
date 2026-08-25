<script lang="ts">
	import Button from '$components/primitives/Button.svelte';
	import Icon from '$components/primitives/Icon.svelte';
	import TripStatusBadge from './TripStatusBadge.svelte';
	import * as m from '$lib/paraglide/messages';
	import type { TripStatus } from '$types/fleet';
	import { tripStatusSequence } from '$types/fleet';
	import { tripStatusLabel } from '$utils/trip-status';

	/**
	 * Advancing a trip along its lifecycle.
	 *
	 * One button, not a picker: at any moment there is exactly one honest next
	 * step, and a driver pulling away from a stand should not have to choose it
	 * from a list. The full sequence is shown above the button as a read-only
	 * track so the driver can see where the run is and what is left.
	 *
	 * A status change is a real state change in the mock, not a local
	 * highlight: the caller writes it through `trips.service`, so the conductor
	 * and Operations see it too.
	 */

	interface Props {
		status: TripStatus;
		/** The next status, or `null` at the end of the line. */
		next: TripStatus | null;
		busy?: boolean;
		onadvance: (to: TripStatus) => void;
	}

	let { status, next, busy = false, onadvance }: Props = $props();

	const currentIndex = $derived(tripStatusSequence.indexOf(status));
</script>

<section
	class="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 shadow-level-1 md:p-6"
	aria-labelledby="trip-status-title"
>
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h3 id="trip-status-title" class="flex items-center gap-2 text-title text-text">
			<span class="text-primary-soft-text"><Icon name="route" size={20} /></span>
			{m.trip_status_title()}
		</h3>
		<TripStatusBadge {status} />
	</div>

	{#if status === 'cancelled'}
		<p class="text-body-sm text-text-muted">{m.trip_status_cancelled_body()}</p>
	{:else}
		<!-- Read-only track. The live state is announced by the badge above, so
		     the steps themselves are presentation. -->
		<ol class="flex flex-col gap-2" aria-hidden="true">
			{#each tripStatusSequence as step, index (step)}
				{@const done = currentIndex > index}
				{@const active = currentIndex === index}
				<li class="flex items-center gap-3">
					<span
						class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-caps
							{active
							? 'bg-primary text-on-primary'
							: done
								? 'bg-success-soft text-success'
								: 'bg-surface-container text-text-faint'}"
					>
						{#if done}
							<Icon name="check" size={14} strokeWidth={2.4} />
						{:else}
							{index + 1}
						{/if}
					</span>
					<span
						class="text-body-sm {active
							? 'font-bold text-text'
							: done
								? 'text-text-muted'
								: 'text-text-faint'}"
					>
						{tripStatusLabel(step)}
					</span>
				</li>
			{/each}
		</ol>

		{#if next}
			<Button size="lg" fullWidth loading={busy} iconRight="arrow-right" onclick={() => onadvance(next)}>
				{m.trip_status_advance({ status: tripStatusLabel(next) })}
			</Button>
		{:else}
			<p class="flex items-start gap-2 text-body-sm text-text-muted">
				<span class="mt-0.5 shrink-0 text-success"><Icon name="check" size={16} /></span>
				{m.trip_status_finished()}
			</p>
		{/if}
	{/if}

	<p class="flex items-start gap-2 text-body-sm text-text-faint">
		<span class="mt-0.5 shrink-0"><Icon name="info" size={16} /></span>
		{m.trip_status_simulated_note()}
	</p>
</section>
