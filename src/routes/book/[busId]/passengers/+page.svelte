<script>
import { goto } from '$app/navigation';
import { page } from '$app/state';
import BookingStepBar from '$components/booking/BookingStepBar.svelte';
import ErrorSummary, {} from '$components/booking/ErrorSummary.svelte';
import FareSummary from '$components/booking/FareSummary.svelte';
import PassengerForm from '$components/booking/PassengerForm.svelte';
import BookingProgress from '$components/journey/BookingProgress.svelte';
import Button from '$components/primitives/Button.svelte';
import EmptyState from '$components/primitives/EmptyState.svelte';
import Icon from '$components/primitives/Icon.svelte';
import * as m from '$lib/paraglide/messages';
import { calculateFare } from '$services/fare.service';
import { bookingDraft } from '$stores/booking.svelte';
import { passengers, validatePassenger } from '$stores/passengers.svelte';
import { journeySearch } from '$stores/search.svelte';
let { data } = $props();
$effect(() => {
    journeySearch.hydrateFromParams(page.url.searchParams);
});
const searchParams = $derived(journeySearch.toParams().toString());
const seats = $derived(bookingDraft.orderedSeats);
/** Errors are only revealed after a submit attempt or once a field is fixed. */
let showErrors = $state(false);
let submitting = $state(false);
// Keep one form per selected seat at all times.
$effect(() => {
    const current = seats;
    if (passengers.seatIds.length !== current.length ||
        passengers.seatIds.some((seatId, index) => seatId !== current[index])) {
        passengers.syncToSeats(current);
    }
});
const fieldErrors = $derived(passengers.entries.map((entry) => {
    if (!showErrors)
        return {};
    const issues = validatePassenger(entry);
    const map = {};
    for (const issue of issues)
        map[issue.field] = resolveMessage(issue.messageKey);
    return map;
}));
const summaryIssues = $derived(showErrors
    ? passengers.entries.flatMap((entry, index) => validatePassenger(entry).map((issue) => ({
        fieldId: `passenger-${index}-${fieldSlug(issue.field)}`,
        label: m.passengers_error_jump({
            number: index + 1,
            field: fieldLabel(issue.field)
        }),
        message: resolveMessage(issue.messageKey)
    })))
    : []);
const isComplete = $derived(passengers.isComplete);
const fare = $derived(data.bus
    ? calculateFare(data.bus, seats.length, passengers.concessionRequested)
    : calculateFare({ baseFare: 0, taxes: 0 }, 0));
function fieldSlug(field) {
    return field === 'fullName' ? 'name' : field;
}
function fieldLabel(field) {
    return {
        fullName: m.passenger_field_name(),
        age: m.passenger_field_age(),
        gender: m.passenger_field_gender()
    }[field];
}
/** Maps a validation message key to its localised text. */
function resolveMessage(key) {
    return ({
        passenger_error_name_required: m.passenger_error_name_required(),
        passenger_error_name_short: m.passenger_error_name_short(),
        passenger_error_age_required: m.passenger_error_age_required(),
        passenger_error_age_range: m.passenger_error_age_range(),
        passenger_error_gender_required: m.passenger_error_gender_required()
    }[key] ?? key);
}
function focusField(fieldId) {
    const element = document.getElementById(fieldId);
    element?.focus();
    element?.scrollIntoView({ block: 'center', behavior: 'auto' });
}
async function onsubmit(event) {
    event.preventDefault();
    if (submitting)
        return;
    showErrors = true;
    if (!passengers.isComplete) {
        // Let the summary render, then move focus to the first invalid field.
        await Promise.resolve();
        const first = summaryIssues[0];
        if (first)
            focusField(first.fieldId);
        return;
    }
    submitting = true;
    try {
        await goto(`/book/${data.busId}/review${searchParams ? `?${searchParams}` : ''}`);
    }
    finally {
        submitting = false;
    }
}
const backHref = $derived(`/book/${data.busId}/seats${searchParams ? `?${searchParams}` : ''}`);
</script>

<svelte:head>
	<title>{m.passengers_page_title()} — {m.app_name()}</title>
</svelte:head>

<BookingStepBar title={m.passengers_heading()} {backHref} step={3} />

{#if !data.bus}
	<div class="shell-width w-full px-4 py-10 md:px-6">
		<EmptyState
			title={m.booking_bus_missing_title()}
			body={m.booking_bus_missing_body()}
			icon="bus"
			action={exploreAction}
		/>
	</div>
{:else if seats.length === 0}
	<div class="shell-width w-full px-4 py-10 md:px-6">
		<EmptyState
			title={m.booking_no_seats_title()}
			body={m.booking_no_seats_body()}
			icon="seat"
			action={seatsAction}
		/>
	</div>
{:else}
	<form
		class="shell-width flex w-full flex-col gap-6 px-4 py-6 md:flex-row md:gap-8 md:px-6 md:py-8"
		{onsubmit}
		novalidate
	>
		<!-- Forms -->
		<div class="flex w-full flex-col gap-6 md:flex-1">
			<BookingProgress current={3} variant="full" />

			<div>
				<h2 class="text-headline-sm text-text md:text-headline">{m.passengers_heading()}</h2>
				<p class="mt-1 text-body-sm text-text-muted">{m.passengers_subtitle()}</p>
				<p class="mt-2 flex items-start gap-2 text-body-sm text-text-muted">
					<span class="mt-0.5 shrink-0 text-primary-soft-text">
						<Icon name="shield" size={16} />
					</span>
					{m.booking_privacy_note()}
				</p>
			</div>

			<ErrorSummary issues={summaryIssues} onjump={focusField} />

			{#each seats as seatId, index (seatId)}
				<!-- Once the summary is showing, `fieldErrors` recomputes on every
				     keystroke, so fixing a field clears its message immediately. -->
				<PassengerForm {index} {seatId} errors={fieldErrors[index] ?? {}} />
			{/each}

			<p class="sr-only" aria-live="polite">
				{isComplete ? m.passengers_complete_announce() : ''}
			</p>
		</div>

		<!-- Sticky fare rail -->
		<div class="w-full md:w-[360px] md:shrink-0">
			<FareSummary {fare} note={m.review_terms()} action={submitAction} class="md:sticky md:top-24" />
		</div>
	</form>
{/if}

{#snippet exploreAction()}
	<Button href="/explore" variant="secondary" iconLeft="explore">
		{m.booking_back_to_explore()}
	</Button>
{/snippet}

{#snippet seatsAction()}
	<Button href={backHref} variant="secondary" iconLeft="seat">{m.booking_go_to_seats()}</Button>
{/snippet}

{#snippet submitAction()}
	<Button type="submit" size="lg" fullWidth iconRight="arrow-right" loading={submitting}>
		{m.passengers_continue()}
	</Button>
{/snippet}
