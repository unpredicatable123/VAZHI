<script>
import SandboxNotice from '$components/booking/SandboxNotice.svelte';
import BoardingStats from '$components/conductor/BoardingStats.svelte';
import TripSummaryCard from '$components/conductor/TripSummaryCard.svelte';
import Button from '$components/primitives/Button.svelte';
import EmptyState from '$components/primitives/EmptyState.svelte';
import ErrorState from '$components/primitives/ErrorState.svelte';
import Icon from '$components/primitives/Icon.svelte';
import Skeleton from '$components/primitives/Skeleton.svelte';
import * as m from '$lib/paraglide/messages';
import { getAssignment, getManifest, totalsFor } from '$services/conductor.service';
import { session } from '$stores/session.svelte';
/**
 * Conductor dashboard.
 *
 * Operational, not administrative: the assigned service, how boarding is
 * progressing, and one tap through to the work.
 */
let assignment = $state(null);
let totals = $state(null);
let loadState = $state('loading');
async function load() {
    const conductorId = session.current?.id;
    if (!conductorId)
        return;
    loadState = 'loading';
    assignment = null;
    totals = null;
    const assignmentResult = await getAssignment(conductorId);
    if (assignmentResult.status === 'error') {
        loadState = assignmentResult.error.code === 'not_found' ? 'empty' : 'error';
        return;
    }
    const manifestResult = await getManifest();
    if (manifestResult.status === 'error') {
        loadState = manifestResult.error.code === 'not_found' ? 'empty' : 'error';
        return;
    }
    assignment = assignmentResult.data;
    totals = totalsFor(manifestResult.data, assignmentResult.data.capacity);
    loadState = 'ready';
}
$effect(() => {
    if (session.current?.role === 'conductor')
        load();
});
</script>

<svelte:head>
	<title>{m.conductor_dashboard_title()} — {m.app_name()}</title>
</svelte:head>

<div class="shell-width flex w-full flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
	<header class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h2 class="text-headline-sm text-text md:text-headline">
				{m.conductor_dashboard_title()}
			</h2>
			<p class="mt-1 text-body-sm text-text-muted">{m.conductor_dashboard_subtitle()}</p>
		</div>
		{#if session.current}
			<div
				class="flex items-center gap-2 rounded-[8px] border border-border bg-surface px-3 py-2"
			>
				<span class="text-primary-soft-text"><Icon name="clipboard" size={18} /></span>
				<span class="min-w-0">
					<span class="block text-caps uppercase text-text-muted">
						{m.conductor_crew_label()}
					</span>
					<span class="text-mono-data block text-body-sm text-text">
						{session.current.id}
					</span>
				</span>
			</div>
		{/if}
	</header>

	<SandboxNotice title={m.conductor_simulated_title()} body={m.conductor_simulated_body()} />

	{#if loadState === 'loading'}
		<div class="flex flex-col gap-4" aria-busy="true">
			<Skeleton width="100%" height="180px" radius="card" />
			<Skeleton width="100%" height="220px" radius="card" />
		</div>
	{:else if loadState === 'empty'}
		<EmptyState icon="calendar" title={m.assignment_none_title()} body={m.assignment_none_body()} />
	{:else if loadState === 'error' || !assignment || !totals}
		<ErrorState
			title={m.trip_error_title()}
			body={m.trip_error_body()}
			onRetry={load}
		/>
	{:else}
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<TripSummaryCard {assignment} status={assignment.status} />
			<BoardingStats {totals} capacity={assignment.capacity} />
		</div>

		<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
			<Button href="/conductor/verify" size="lg" iconLeft="scan">
				{m.conductor_nav_verify()}
			</Button>
			<Button href="/conductor/passengers" variant="secondary" iconLeft="seat">
				{m.conductor_nav_passengers()}
			</Button>
			<Button href="/conductor/trip" variant="secondary" iconLeft="bus">
				{m.conductor_nav_trip()}
			</Button>
		</div>
	{/if}
</div>
