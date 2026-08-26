<script>
import { goto } from '$app/navigation';
import Button from '$components/primitives/Button.svelte';
import Icon from '$components/primitives/Icon.svelte';
import TripForm from '$components/operations/TripForm.svelte';
import * as m from '$lib/paraglide/messages';
import { createTrip } from '$services/trips.service';
import { toasts } from '$stores/toast.svelte';
/**
 * Create a trip.
 *
 * The screen that answers the question the whole model exists for: the same
 * bus can run Salem → Chennai one day and Salem → Bangalore another, because a
 * corridor is chosen here, per running, rather than stamped onto a vehicle.
 *
 * Validation and conflict detection live in `trips.service`, so the same
 * rules would apply to a scheduling API later. This page only carries the
 * result back to the form.
 */
let issues = $state([]);
let conflicts = $state([]);
let saving = $state(false);
async function save(draft) {
    saving = true;
    issues = [];
    conflicts = [];
    const result = await createTrip(draft);
    saving = false;
    if (result.status === 'error') {
        issues = result.failure?.issues ?? [];
        conflicts = result.failure?.conflicts ?? [];
        toasts.show(m.ops_trip_error_title(), 'warning');
        return;
    }
    toasts.show(m.ops_trip_created({ trip: result.data.code }), 'success');
    await goto('/operations/trips');
}
/** The order the form works in, restated so the flow is legible up front. */
const steps = [
    m.ops_field_route(),
    m.ops_field_date(),
    m.ops_field_bus(),
    m.ops_field_driver(),
    m.ops_field_conductor(),
    m.ops_field_departure(),
    m.ops_field_arrival(),
    m.ops_field_platform()
];
</script>

<svelte:head>
	<title>{m.ops_create_trip()} — {m.app_name()}</title>
</svelte:head>

<div class="shell-width flex w-full max-w-4xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
	<header class="flex flex-col gap-3">
		<Button href="/operations/trips" variant="ghost" iconLeft="chevron-left" class="self-start">
			{m.ops_nav_trips()}
		</Button>
		<div>
			<h2 class="text-headline-sm text-text md:text-headline">{m.ops_create_trip()}</h2>
			<p class="mt-1 text-body-sm text-text-muted">{m.ops_create_trip_subtitle()}</p>
		</div>
	</header>

	<!-- What this form assembles, in order. Reading it makes the model obvious
	     before a single field is touched. -->
	<ol class="flex flex-wrap items-center gap-x-2 gap-y-1" aria-label={m.ops_create_steps_label()}>
		{#each steps as step, index (step)}
			<li class="flex items-center gap-2 text-body-sm text-text-muted">
				<span class="text-caps uppercase text-text-faint">{index + 1}</span>
				{step}
				{#if index < steps.length - 1}
					<Icon name="chevron-right" size={14} class="text-text-faint" />
				{/if}
			</li>
		{/each}
	</ol>

	<TripForm onsave={save} {issues} {conflicts} {saving} />
</div>
