<script lang="ts">
	import TicketCodePanel from '$components/booking/TicketCodePanel.svelte';
	import Button from '$components/primitives/Button.svelte';
	import EmptyState from '$components/primitives/EmptyState.svelte';
	import Icon from '$components/primitives/Icon.svelte';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import { toasts } from '$stores/toast.svelte';
	import type { Locale } from '$types/preferences';
	import { formatClock, formatDuration, formatJourneyDate } from '$utils/format';
	import { saveCalendarFile, saveTicketFile } from '$utils/ticket-file';
	import type { PageData } from './$types';

	/**
	 * Digital Ticket (specification section 10).
	 *
	 * Carries the booking reference, journey, boarding platform, seat, and fare.
	 * It shows no passenger name, age, or gender — and cannot, because the
	 * `Booking` record has no such field. The same is true of the saved file
	 * and the calendar entry.
	 */

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const locale = $derived(getLocale() as Locale);
	const booking = $derived(data.booking);

	const fileLabels = $derived({
		app: m.app_name(),
		ticket: m.ticket_heading(),
		pnr: m.ticket_pnr_label(),
		service: m.ticket_service_label(),
		date: m.ticket_date_label(),
		platform: m.ticket_platform_label(),
		seats: m.ticket_seats_label(),
		total: m.fare_total(),
		vehicle: m.bus_vehicle_number(),
		privacy: m.ticket_privacy_note()
	});

	function save() {
		if (!booking) return;
		saveTicketFile(booking, fileLabels);
		toasts.show(m.ticket_saved(), 'success');
	}

	function addToCalendar() {
		if (!booking) return;
		saveCalendarFile(booking, fileLabels);
		toasts.show(m.ticket_calendar_added(), 'success');
	}

	async function share() {
		if (!booking) return;
		const url = `${location.origin}/trips/${booking.pnr}/track`;
		try {
			if (navigator.share) {
				await navigator.share({ title: m.app_name(), url });
			} else {
				await navigator.clipboard.writeText(url);
				toasts.show(m.ticket_share_copied(), 'success');
			}
		} catch {
			// Sharing can be dismissed or unavailable; nothing to recover.
		}
	}
</script>

<svelte:head>
	<title>{m.ticket_page_title()} — {m.app_name()}</title>
</svelte:head>

{#if !booking}
	<div class="shell-width w-full px-4 py-10 md:px-6">
		<EmptyState
			title={m.trips_empty_upcoming_title()}
			body={m.trips_empty_upcoming_body()}
			icon="ticket"
		/>
	</div>
{:else}
	<div class="shell-width flex w-full justify-center px-4 py-6 md:px-6 md:py-10">
		<div class="flex w-full max-w-md flex-col gap-6">
			<h2 class="text-headline-sm text-text md:text-headline">{m.ticket_heading()}</h2>

			<!-- Ticket card: coloured stub, perforation, then the details. -->
			<article
				class="overflow-hidden rounded-card border border-border bg-surface shadow-level-2"
				aria-label={m.ticket_heading()}
			>
				<div class="flex flex-col gap-4 bg-primary p-5 text-on-primary">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<p class="text-caps uppercase opacity-80">{m.ticket_service_label()}</p>
							<h3 class="text-title">{booking.serviceName}</h3>
						</div>
						<span
							class="flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5"
						>
							<Icon name="bus" size={16} />
							<span class="text-mono-data text-[13px]">{booking.vehicleNumber}</span>
						</span>
					</div>

					<div class="flex items-end justify-between gap-3">
						<div>
							<p class="text-caps uppercase opacity-80">{m.ticket_pnr_label()}</p>
							<p class="text-mono-data text-[20px] font-bold tracking-widest">
								{booking.pnr}
							</p>
						</div>
						<div class="text-right">
							<p class="text-caps uppercase opacity-80">{m.ticket_date_label()}</p>
							<p class="text-body font-semibold">
								{formatJourneyDate(booking.travelDate, locale)}
							</p>
						</div>
					</div>
				</div>

				<!-- Perforation -->
				<div class="relative h-4 bg-surface" aria-hidden="true">
					<span
						class="absolute top-1/2 -left-2 h-4 w-4 -translate-y-1/2 rounded-full
							bg-background"
					></span>
					<span
						class="absolute top-1/2 left-0 w-full -translate-y-1/2 border-t-2 border-dashed
							border-border"
					></span>
					<span
						class="absolute top-1/2 -right-2 h-4 w-4 -translate-y-1/2 rounded-full
							bg-background"
					></span>
				</div>

				<div class="flex flex-col gap-5 p-5">
					<div class="flex items-center justify-between gap-3">
						<div class="flex min-w-0 flex-col">
							<span class="text-mono-data text-title font-bold text-text">
								{formatClock(booking.departure)}
							</span>
							<span class="truncate text-body-sm text-text-muted">{booking.originName}</span>
						</div>

						<div class="relative flex flex-1 flex-col items-center px-2">
							<span class="h-px w-full bg-border" aria-hidden="true"></span>
							<span class="text-mono-data mt-1 text-[11px] text-text-faint">
								{formatDuration(booking.durationMinutes)}
							</span>
						</div>

						<div class="flex min-w-0 flex-col text-right">
							<span class="text-mono-data text-title font-bold text-text">
								{formatClock(booking.arrival)}
							</span>
							<span class="truncate text-body-sm text-text-muted">
								{booking.destinationName}
							</span>
						</div>
					</div>

					<dl
						class="grid grid-cols-2 rounded-[8px] border border-border bg-surface-container p-4"
					>
						<div class="flex flex-col items-center border-r border-border">
							<dt class="text-caps uppercase text-text-muted">
								{m.ticket_platform_label()}
							</dt>
							<dd class="text-mono-data text-title font-semibold text-text">
								{booking.boardingPlatform}
							</dd>
						</div>
						<div class="flex flex-col items-center">
							<dt class="text-caps uppercase text-text-muted">
								{booking.seatIds.length === 1
									? m.ticket_seat_label()
									: m.ticket_seats_label()}
							</dt>
							<dd class="text-mono-data text-title font-semibold text-text">
								{booking.seatIds.join(', ')}
							</dd>
						</div>
					</dl>

					<TicketCodePanel pnr={booking.pnr} />

					<p class="flex items-start gap-2 text-body-sm text-text-muted">
						<span class="mt-0.5 shrink-0 text-primary-soft-text">
							<Icon name="shield" size={16} />
						</span>
						{m.ticket_privacy_note()}
					</p>
				</div>
			</article>

			<div class="flex flex-col gap-2 pb-4">
				<Button size="lg" fullWidth iconLeft="ticket" onclick={save}>
					{m.ticket_save()}
				</Button>
				<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
					<Button variant="secondary" iconLeft="calendar" onclick={addToCalendar}>
						{m.ticket_add_calendar()}
					</Button>
					<Button variant="secondary" iconLeft="route" onclick={share}>
						{m.ticket_share()}
					</Button>
				</div>
				<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
					<Button href="/trips" variant="ghost" iconLeft="bus">
						{m.ticket_view_trips()}
					</Button>
					<Button href="/help" variant="ghost" iconLeft="help">{m.ticket_help()}</Button>
				</div>
			</div>
		</div>
	</div>
{/if}
