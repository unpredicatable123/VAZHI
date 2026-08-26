<script>
import { goto, invalidateAll } from '$app/navigation';
import Button from '$components/primitives/Button.svelte';
import EmptyState from '$components/primitives/EmptyState.svelte';
import TripCard from '$components/trips/TripCard.svelte';
import TripTabs from '$components/trips/TripTabs.svelte';
import * as m from '$lib/paraglide/messages';
import { cancelBooking, filterTrips } from '$services/bookings.service';
import { toasts } from '$stores/toast.svelte';
import { checkCancellationEligibility } from '$utils/cancellation';
let { data } = $props();
let filter = $state('upcoming');
let cancellingPnr = $state(null);
const counts = $derived({
    upcoming: filterTrips(data.trips, 'upcoming').length,
    completed: filterTrips(data.trips, 'completed').length,
    cancelled: filterTrips(data.trips, 'cancelled').length
});
const visible = $derived(filterTrips(data.trips, filter));
const emptyCopy = $derived({
    upcoming: { title: m.trips_empty_upcoming_title(), body: m.trips_empty_upcoming_body() },
    completed: {
        title: m.trips_empty_completed_title(),
        body: m.trips_empty_completed_body()
    },
    cancelled: {
        title: m.trips_empty_cancelled_title(),
        body: m.trips_empty_cancelled_body()
    }
}[filter]);
async function onCancel(booking) {
    const eligibility = checkCancellationEligibility(booking.travelDate, booking.departure);
    if (!eligibility.canCancel) {
        toasts.show(eligibility.reason ?? 'Cancellations must be requested at least 3 hours before departure.', 'error');
        return;
    }
    if (!confirm('Request cancellation for this booking? This request will be submitted to Operations for refund approval.'))
        return;
    cancellingPnr = booking.pnr;
    const result = await cancelBooking(booking.pnr, booking);
    cancellingPnr = null;
    if (result.status === 'ok') {
        await invalidateAll();
        toasts.show('Cancellation request submitted. Awaiting Operations refund approval.', 'info');
        await goto(`/refund/${result.data.refundId}`);
    }
    else {
        toasts.show(result.error.messageKey ?? 'Could not submit cancellation request', 'error');
    }
}
</script>

<svelte:head>
	<title>{m.trips_page_title()} — {m.app_name()}</title>
</svelte:head>

<div class="shell-width flex w-full flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
	<header>
		<h2 class="text-headline-sm text-text md:text-headline">{m.trips_heading()}</h2>
		<p class="mt-1 text-body-sm text-text-muted">{m.trips_subtitle()}</p>
	</header>

	<TripTabs selected={filter} {counts} onselect={(next) => (filter = next)} />

	<div id="trip-panel" role="tabpanel" aria-labelledby="trip-tab-{filter}" tabindex="-1">
		<p class="sr-only" aria-live="polite">
			{visible.length === 1 ? m.trips_count_one() : m.trips_count({ count: visible.length })}
		</p>

		{#if visible.length === 0}
			<EmptyState
				title={emptyCopy.title}
				body={emptyCopy.body}
				icon="ticket"
				action={filter === 'upcoming' ? searchAction : undefined}
			/>
		{:else}
			<ul class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
				{#each visible as booking (booking.pnr)}
					<li class="flex">
						<TripCard
							{booking}
							oncancel={booking.status === 'confirmed' ? onCancel : undefined}
							cancelling={cancellingPnr === booking.pnr}
						/>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>

{#snippet searchAction()}
	<Button href="/" variant="secondary" iconLeft="search">{m.trips_find_buses()}</Button>
{/snippet}
