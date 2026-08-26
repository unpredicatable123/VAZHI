<script>
import PnrDisplay from '$components/booking/PnrDisplay.svelte';
import BookingProgress from '$components/journey/BookingProgress.svelte';
import Button from '$components/primitives/Button.svelte';
import EmptyState from '$components/primitives/EmptyState.svelte';
import Icon from '$components/primitives/Icon.svelte';
import * as m from '$lib/paraglide/messages';
import { getLocale } from '$lib/paraglide/runtime';
import { toasts } from '$stores/toast.svelte';
import { formatClock, formatFare, formatJourneyDate } from '$utils/format';
let { data } = $props();
const locale = $derived(getLocale());
const booking = $derived(data.booking);
/** Focus target so the confirmation is announced on arrival. */
let heading = $state(null);
$effect(() => {
    heading?.focus();
});
async function share() {
    if (!booking)
        return;
    const url = `${location.origin}/trips/${booking.pnr}/track`;
    try {
        if (navigator.share) {
            await navigator.share({ title: m.app_name(), url });
        }
        else {
            await navigator.clipboard.writeText(url);
            toasts.show(m.ticket_share_copied(), 'success');
        }
    }
    catch {
        // Sharing can be dismissed or unavailable; nothing to recover.
    }
}
</script>

<svelte:head>
	<title>{m.confirmation_page_title()} — {m.app_name()}</title>
</svelte:head>

{#if !booking}
	<div class="shell-width w-full px-4 py-10 md:px-6">
		<EmptyState title={m.trips_empty_upcoming_title()} body={m.trips_empty_upcoming_body()} icon="ticket" />
	</div>
{:else}
	<div class="shell-width flex w-full flex-col items-center gap-6 px-4 py-8 md:px-6 md:py-12">
		<div class="w-full max-w-lg">
			<BookingProgress current={6} variant="full" />
		</div>
		<div
			class="flex w-full max-w-lg flex-col items-center gap-6 rounded-card border border-border
				bg-surface p-6 text-center shadow-level-2 md:p-8"
		>
			<span
				class="flex h-20 w-20 items-center justify-center rounded-full bg-primary
					text-on-primary"
			>
				<Icon name="check" size={40} strokeWidth={3} label={m.confirmation_page_title()} />
			</span>

			<div>
				<h2
					bind:this={heading}
					tabindex="-1"
					class="text-headline-sm text-primary-soft-text md:text-headline"
				>
					{m.confirmation_heading({ destination: booking.destinationName })}
				</h2>
				<p class="mt-1 text-body text-text-muted">{m.confirmation_subtitle()}</p>
			</div>

			<PnrDisplay pnr={booking.pnr} class="w-full" />

			<!-- Trip summary -->
			<div
				class="flex w-full flex-col gap-3 rounded-[8px] border border-border
					bg-surface-container p-4 text-left"
			>
				<div class="flex items-start justify-between gap-3 border-b border-border pb-3">
					<div>
						<p class="text-title text-text">{booking.serviceName}</p>
						<p class="text-mono-data text-body-sm text-text-muted">{booking.vehicleNumber}</p>
					</div>
					<div class="text-right">
						<p class="text-mono-data text-title font-bold text-primary-soft-text">
							{formatFare(booking.fare.total, locale)}
						</p>
						<p class="text-body-sm text-text-muted">{m.confirmation_paid()}</p>
					</div>
				</div>

				<div class="flex items-center justify-between gap-3">
					<div class="flex min-w-0 flex-col">
						<span class="text-mono-data text-title font-semibold text-text">
							{formatClock(booking.departure)}
						</span>
						<span class="truncate text-body-sm text-text-muted">{booking.originName}</span>
					</div>
					<Icon name="arrow-right" size={20} class="shrink-0 text-text-muted" />
					<div class="flex min-w-0 flex-col text-right">
						<span class="text-mono-data text-title font-semibold text-text">
							{formatClock(booking.arrival)}
						</span>
						<span class="truncate text-body-sm text-text-muted">
							{booking.destinationName}
						</span>
					</div>
				</div>

				<p class="text-body-sm text-text-muted">
					{formatJourneyDate(booking.travelDate, locale)}
				</p>

				<div class="flex justify-between gap-4 rounded-[6px] bg-surface p-3">
					<div>
						<p class="text-caps uppercase text-text-muted">{m.confirmation_platform()}</p>
						<p class="text-mono-data text-title font-semibold text-text">
							{booking.boardingPlatform}
						</p>
					</div>
					<div class="text-right">
						<p class="text-caps uppercase text-text-muted">{m.confirmation_seats()}</p>
						<p class="text-mono-data text-title font-semibold text-text">
							{booking.seatIds.join(', ')}
						</p>
					</div>
				</div>
			</div>

			<p class="text-caps uppercase text-primary-soft-text">{m.confirmation_complete()}</p>

			<!--
				The ticket is emailed by a Firestore trigger on the booking, so it is
				already on its way by the time this renders. Worded as in progress
				rather than delivered, because the queue is not the inbox.
			-->
			<p
				class="flex w-full items-start gap-2 rounded-[8px] border border-border
					bg-surface-container p-3 text-left text-body-sm text-text-muted"
			>
				<span class="mt-0.5 shrink-0 text-primary-soft-text">
					<Icon name="ticket" size={16} />
				</span>
				<span>
					<span class="block font-semibold text-text">{m.ticket_emailed_title()}</span>
					{m.ticket_emailed_body()}
				</span>
			</p>

			<p class="flex items-start gap-2 text-left text-body-sm text-text-muted">
				<span class="mt-0.5 shrink-0 text-primary-soft-text">
					<Icon name="shield" size={16} />
				</span>
				{m.confirmation_privacy_note()}
			</p>

			<div class="flex w-full flex-col gap-2">
				<Button href={`/ticket/${booking.pnr}`} size="lg" fullWidth iconLeft="ticket">
					{m.confirmation_view_ticket()}
				</Button>
				<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
					<Button href="/trips" variant="secondary" iconLeft="bus">
						{m.confirmation_view_trips()}
					</Button>
					<Button variant="secondary" iconLeft="route" onclick={share}>
						{m.confirmation_share()}
					</Button>
				</div>
				<Button href="/" variant="ghost" fullWidth>{m.confirmation_return_home()}</Button>
			</div>
		</div>
	</div>
{/if}
