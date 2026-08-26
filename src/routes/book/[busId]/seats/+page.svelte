<script>
import { untrack } from 'svelte';
import { page } from '$app/state';
import BookingActionBar from '$components/booking/BookingActionBar.svelte';
import BookingStepBar from '$components/booking/BookingStepBar.svelte';
import ComfortMapPanel from '$components/booking/ComfortMapPanel.svelte';
import ComfortPreferences from '$components/booking/ComfortPreferences.svelte';
import SeatMap from '$components/booking/SeatMap.svelte';
import SleeperMap from '$components/booking/SleeperMap.svelte';
import VehicleInfoCard from '$components/booking/VehicleInfoCard.svelte';
import BookingProgress from '$components/journey/BookingProgress.svelte';
import Button from '$components/primitives/Button.svelte';
import EmptyState from '$components/primitives/EmptyState.svelte';
import * as m from '$lib/paraglide/messages';
import { getLocale } from '$lib/paraglide/runtime';
import { calculateFare } from '$services/fare.service';
import { recommendSeats } from '$services/seats.service';
import { bookingDraft, compareSeatIds } from '$stores/booking.svelte';
import { passengers } from '$stores/passengers.svelte';
import Icon from '$components/primitives/Icon.svelte';
import { preferences } from '$stores/preferences.svelte';
import { journeySearch } from '$stores/search.svelte';
import { formatFare } from '$utils/format';
let { data } = $props();
const seed = untrack(() => data);
// Route criteria only — never any passenger identity.
$effect(() => {
    journeySearch.hydrateFromParams(page.url.searchParams);
});
const locale = $derived(getLocale());
const searchParams = $derived(journeySearch.toParams().toString());
const passengerCount = $derived(journeySearch.passengers);
const originStop = $derived(data.bus ? data.stops.find((stop) => stop.id === data.bus?.originStopId) : undefined);
const destinationStop = $derived(data.bus ? data.stops.find((stop) => stop.id === data.bus?.destinationStopId) : undefined);
// Dynamic recommendations: they re-rank whenever comfort preferences or
// Accessible Travel Mode change.
const recommended = $derived(data.deck
    ? recommendSeats(data.deck, bookingDraft.comfort, passengerCount, preferences.accessibleTravelMode)
    : []);
const selected = $derived(bookingDraft.selectedSeats);
const orderedSelection = $derived([...selected].sort(compareSeatIds));
const remaining = $derived(Math.max(0, passengerCount - selected.length));
const fare = $derived(data.bus
    ? calculateFare(data.bus, selected.length)
    : calculateFare({ baseFare: 0, taxes: 0 }, 0));
// Seeds the draft for this bus, pre-selecting the recommended seats so the
// screen opens in the same state the Stitch design shows. Seat 5C leads the
// default ranking, making it the illustrative seat across the flow.
//
// Waits for `preferences.initialised` so the seeding never runs against the
// pre-hydration defaults — otherwise Accessible Travel Mode would be read as
// off and the accessible seats would not be pre-selected.
$effect(() => {
    if (!seed.deck || !seed.bus)
        return;
    if (!preferences.initialised)
        return;
    untrack(() => {
        bookingDraft.startFor(seed.busId);
        if (bookingDraft.selectedSeats.length === 0) {
            bookingDraft.setSeats(recommendSeats(seed.deck, bookingDraft.comfort, journeySearch.passengers, preferences.accessibleTravelMode));
        }
    });
});
// Dropping the passenger count must drop the extra seats too, so the seat
// list and the forms can never disagree.
$effect(() => {
    const count = passengerCount;
    if (bookingDraft.selectedSeats.length > count) {
        bookingDraft.setSeats(bookingDraft.selectedSeats.slice(0, count));
    }
});
function toggleSeat(seatId) {
    bookingDraft.toggleSeat(seatId, passengerCount);
    // Keep the forms aligned with the seats as they change.
    passengers.syncToSeats([...bookingDraft.selectedSeats].sort(compareSeatIds));
}
const continueHref = $derived(`/book/${data.busId}/passengers${searchParams ? `?${searchParams}` : ''}`);
const backHref = $derived(`/explore${searchParams ? `?${searchParams}` : ''}`);
const canContinue = $derived(selected.length === passengerCount && passengerCount > 0);
const selectionLabel = $derived(selected.length === 0
    ? m.seats_selected_none()
    : selected.length === 1
        ? m.seats_selected_count_one()
        : m.seats_selected_count({ count: selected.length }));
</script>

<svelte:head>
	<title>{m.seats_page_title()} — {m.app_name()}</title>
</svelte:head>

<BookingStepBar title={m.seats_heading()} {backHref} step={2} />

{#if !data.bus || !data.deck}
	<div class="shell-width w-full px-4 py-10 md:px-6">
		<EmptyState
			title={m.booking_bus_missing_title()}
			body={m.booking_bus_missing_body()}
			icon="bus"
			action={missingAction}
		/>
	</div>
{:else}
	<div class="shell-width flex w-full flex-col gap-4 px-4 py-5 md:px-6 md:py-6">
		<BookingProgress current={2} variant="full" />

		<div>
			<h2 class="text-headline-sm text-text md:text-headline">{m.seats_heading()}</h2>
			<p class="mt-1 text-body-sm text-text-muted">
				{passengerCount === 1
					? m.seats_subtitle_one()
					: m.seats_subtitle({ count: passengerCount })}
			</p>
		</div>

		{#if data.deck.kind === 'sleeper'}
			<p
				class="flex items-start gap-2 rounded-[8px] border border-border bg-surface-container
					p-3 text-body-sm text-text-muted"
				role="note"
			>
				<span class="mt-0.5 shrink-0 text-primary-soft-text"><Icon name="seat" size={18} /></span>
				{m.seats_sleeper_note()}
			</p>
		{/if}

		{#if preferences.accessibleTravelMode}
			<!--
				Says why step-free seats are leading the recommendations.

				Without this the mode is invisible here: it is toggled on another
				screen entirely, so a traveller who has it on — or turned it on to
				look at it — sees accessible seats pre-selected with no explanation
				and reasonably concludes the seat picker is broken.
			-->
			<div
				class="flex flex-wrap items-start gap-3 rounded-[8px] border border-border
					bg-surface-container p-3"
				role="note"
			>
				<span class="mt-0.5 shrink-0 text-primary-soft-text">
					<Icon name="accessible" size={18} />
				</span>
				<div class="min-w-0 flex-1">
					<p class="text-body-sm font-semibold text-text">
						{m.seats_accessible_mode_title()}
					</p>
					<p class="mt-0.5 text-body-sm text-text-muted">{m.seats_accessible_mode_body()}</p>
				</div>
				<a
					href="/account/preferences#accessible-travel-mode"
					class="flex min-h-[44px] shrink-0 items-center text-body-sm font-semibold
						text-primary-soft-text underline-offset-4 hover:underline"
				>
					{m.seats_accessible_mode_action()}
				</a>
			</div>
		{/if}

		<!-- Six-column desktop grid: each top card spans 2/6 columns and the
		     horizontal coach spans the complete 6/6 row below. -->
		<div class="grid w-full grid-cols-1 items-stretch gap-3 md:grid-cols-6">
			<div class="md:col-span-2 [&>*]:h-full">
				<VehicleInfoCard bus={data.bus} {originStop} {destinationStop} />
			</div>
			<div class="md:col-span-2 [&>*]:h-full">
				<ComfortPreferences />
			</div>
			<div class="md:col-span-2 [&>*]:h-full">
				<ComfortMapPanel />
			</div>
			<div class="flex min-w-0 justify-center md:col-span-6">
				<!--
					A sleeper is two tiers of berths, not a floor of seats, so it gets
					its own pair of canvases rather than being forced through the
					seater plan.
				-->
				{#if data.deck.kind === 'sleeper'}
					<SleeperMap deck={data.deck} {selected} {recommended} onselect={toggleSeat} />
				{:else}
					<SeatMap deck={data.deck} {selected} {recommended} onselect={toggleSeat} />
				{/if}
			</div>
		</div>

		<!-- Announced politely so seat changes are heard without stealing focus. -->
		<p class="sr-only" aria-live="polite">
			{selectionLabel}. {orderedSelection.length > 0
				? m.seats_selected_list({ seats: orderedSelection.join(', ') })
				: ''}
			{remaining > 0
				? remaining === 1
					? m.seats_remaining_one()
					: m.seats_remaining({ count: remaining })
				: m.seats_full_notice({ count: passengerCount })}
		</p>

		<!-- Spacer so the fixed mobile action bar never covers the deck. -->
		<div class="h-20 w-full md:hidden" aria-hidden="true"></div>
	</div>

	<BookingActionBar summary={fareSummary} action={continueAction} />
{/if}

{#snippet missingAction()}
	<Button href="/explore" variant="secondary" iconLeft="explore">
		{m.booking_back_to_explore()}
	</Button>
{/snippet}

{#snippet fareSummary()}
	<p class="text-body-sm text-text-muted">
		{selectionLabel}{#if orderedSelection.length > 0}
			<span class="text-mono-data text-text"> ({orderedSelection.join(', ')})</span>
		{/if}
	</p>
	<p class="text-mono-data text-headline-sm font-bold text-text">
		{formatFare(fare.total, locale)}
	</p>
{/snippet}

{#snippet continueAction()}
	{#if canContinue}
		<Button href={continueHref} size="lg" iconRight="arrow-right">
			{m.seats_continue()}
		</Button>
	{:else}
		<Button size="lg" iconRight="arrow-right" disabled>
			{remaining === 1 ? m.seats_remaining_one() : m.seats_remaining({ count: remaining })}
		</Button>
	{/if}
{/snippet}
