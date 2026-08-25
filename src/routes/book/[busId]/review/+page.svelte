<script lang="ts">
	import { page } from '$app/state';
	import BookingStepBar from '$components/booking/BookingStepBar.svelte';
	import FareSummary from '$components/booking/FareSummary.svelte';
	import BookingProgress from '$components/journey/BookingProgress.svelte';
	import Badge from '$components/primitives/Badge.svelte';
	import Button from '$components/primitives/Button.svelte';
	import EmptyState from '$components/primitives/EmptyState.svelte';
	import Icon from '$components/primitives/Icon.svelte';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import { calculateFare } from '$services/fare.service';
	import { bookingDraft } from '$stores/booking.svelte';
	import { passengers } from '$stores/passengers.svelte';
	import { journeySearch } from '$stores/search.svelte';
	import type { AccessibilityRequirement, ConcessionCategory } from '$types/booking';
	import type { Locale } from '$types/preferences';
	import {
		formatClock,
		formatDistance,
		formatDuration,
		formatJourneyDate
	} from '$utils/format';
	import type { PageData } from './$types';

	/**
	 * Review Booking.
	 *
	 * Deliberately a non-identifying summary: it shows the journey, the seats,
	 * the requested concessions and assistance, and the fare. Names, ages, and
	 * genders stay in the in-memory passenger store and are never rendered
	 * here, so nothing on screen can expose a traveller.
	 */

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	$effect(() => {
		journeySearch.hydrateFromParams(page.url.searchParams);
	});

	const locale = $derived(getLocale() as Locale);
	const searchParams = $derived(journeySearch.toParams().toString());
	const seats = $derived(bookingDraft.orderedSeats);

	const originStop = $derived(
		data.bus ? data.stops.find((stop) => stop.id === data.bus?.originStopId) : undefined
	);
	const destinationStop = $derived(
		data.bus ? data.stops.find((stop) => stop.id === data.bus?.destinationStopId) : undefined
	);

	/** Non-identifying projection: seat, completeness, requested options. */
	const summaries = $derived(passengers.summaries);
	const allComplete = $derived(passengers.isComplete);

	const fare = $derived(
		data.bus
			? calculateFare(data.bus, seats.length, passengers.concessionRequested)
			: calculateFare({ baseFare: 0, taxes: 0 }, 0)
	);

	const journeyDate = $derived(formatJourneyDate(journeySearch.date, locale));

	const seatsHref = $derived(`/book/${data.busId}/seats${searchParams ? `?${searchParams}` : ''}`);
	const passengersHref = $derived(
		`/book/${data.busId}/passengers${searchParams ? `?${searchParams}` : ''}`
	);
	const paymentHref = $derived(
		`/book/${data.busId}/payment${searchParams ? `?${searchParams}` : ''}`
	);

	function concessionLabel(value: ConcessionCategory): string {
		return {
			none: m.passenger_concession_none(),
			senior: m.passenger_concession_senior(),
			student: m.passenger_concession_student(),
			pwd: m.passenger_concession_pwd()
		}[value];
	}

	function accessibilityLabel(value: AccessibilityRequirement): string {
		return {
			none: m.passenger_accessibility_none(),
			wheelchair: m.passenger_accessibility_wheelchair(),
			mobility: m.passenger_accessibility_mobility(),
			visual: m.passenger_accessibility_visual(),
			hearing: m.passenger_accessibility_hearing()
		}[value];
	}

	const assistanceRequests = $derived(
		summaries.filter((entry) => entry.accessibility !== 'none')
	);
</script>

<svelte:head>
	<title>{m.review_page_title()} — {m.app_name()}</title>
</svelte:head>

<BookingStepBar title={m.review_page_title()} backHref={passengersHref} step={4} />

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
	<div class="shell-width flex w-full flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
		<BookingProgress current={4} variant="full" />

		<div>
			<h2 class="text-headline-sm text-text md:text-headline">{m.review_heading()}</h2>
			<p class="mt-1 text-body-sm text-text-muted">{m.review_subtitle()}</p>
		</div>

		<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
			<div class="flex flex-col gap-6 md:col-span-2">
				<!-- Journey -->
				<section
					class="rounded-card border border-border bg-surface p-4 shadow-level-1 md:p-6"
					aria-labelledby="review-journey"
				>
					<div class="flex items-center justify-between gap-3">
						<h3
							id="review-journey"
							class="flex items-center gap-2 text-title text-text"
						>
							<span class="text-primary-soft-text"><Icon name="route" size={20} /></span>
							{m.review_journey_title()}
						</h3>
						<a
							href="/explore?{searchParams}"
							class="flex min-h-[44px] items-center rounded-[8px] px-3 text-body-sm
								font-semibold text-primary-soft-text hover:bg-surface-container"
						>
							{m.review_edit_journey()}
						</a>
					</div>

					<div
						class="mt-4 flex flex-col gap-4 rounded-[8px] bg-surface-container p-4
							sm:flex-row sm:items-center sm:justify-between"
					>
						<div class="flex flex-col">
							<span class="text-caps uppercase text-text-muted">{m.review_from()}</span>
							<span class="text-title text-text">{originStop?.name ?? '—'}</span>
							<span class="text-mono-data mt-1 text-[14px] text-text">
								{formatClock(data.bus.departure)}, {journeyDate}
							</span>
						</div>

						<Icon name="arrow-right" size={20} class="shrink-0 text-text-muted" />

						<div class="flex flex-col sm:text-right">
							<span class="text-caps uppercase text-text-muted">{m.review_to()}</span>
							<span class="text-title text-text">{destinationStop?.name ?? '—'}</span>
							<span class="text-mono-data mt-1 text-[14px] text-text">
								{formatClock(data.bus.arrival)}, {journeyDate}
							</span>
						</div>
					</div>

					<div
						class="mt-4 flex items-start gap-3 rounded-[8px] bg-primary-soft p-3
							text-primary-soft-text"
					>
						<Icon name="bus" size={20} class="mt-0.5 shrink-0" />
						<div>
							<p class="text-body font-semibold">{data.bus.serviceName}</p>
							<p class="text-mono-data mt-0.5 text-[13px]">
								{data.bus.vehicleNumber} · {m.review_platform({
									platform: data.bus.boardingPlatform
								})} · {data.bus.amenities.airConditioned ? m.bus_ac() : m.bus_non_ac()} ·
								{data.bus.amenities.seatLayout}
							</p>
						</div>
					</div>

					<dl class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
						<div>
							<dt class="text-caps uppercase text-text-muted">{m.review_boarding()}</dt>
							<dd class="text-body-sm text-text">{originStop?.name ?? '—'}</dd>
						</div>
						<div>
							<dt class="text-caps uppercase text-text-muted">{m.review_duration()}</dt>
							<dd class="text-mono-data text-body-sm text-text">
								{formatDuration(data.bus.durationMinutes)}
							</dd>
						</div>
						<div>
							<dt class="text-caps uppercase text-text-muted">{m.review_distance()}</dt>
							<dd class="text-mono-data text-body-sm text-text">
								{formatDistance(data.bus.distanceKm)}
							</dd>
						</div>
					</dl>
				</section>

				<!-- Seats + passengers, non-identifying -->
				<section
					class="rounded-card border border-border bg-surface p-4 shadow-level-1 md:p-6"
					aria-labelledby="review-passengers"
				>
					<div class="flex items-center justify-between gap-3">
						<h3
							id="review-passengers"
							class="flex items-center gap-2 text-title text-text"
						>
							<span class="text-primary-soft-text"><Icon name="person" size={20} /></span>
							{m.review_passengers_title()}
						</h3>
						<a
							href={passengersHref}
							class="flex min-h-[44px] items-center rounded-[8px] px-3 text-body-sm
								font-semibold text-primary-soft-text hover:bg-surface-container"
						>
							{m.review_edit_passengers()}
						</a>
					</div>

					<p class="mt-2 flex items-start gap-2 text-body-sm text-text-muted">
						<span class="mt-0.5 shrink-0 text-primary-soft-text">
							<Icon name="shield" size={16} />
						</span>
						{m.review_privacy_note()}
					</p>

					<ul class="mt-4 flex flex-col gap-2">
						{#each summaries as summary (summary.seatId)}
							<li
								class="flex flex-wrap items-center gap-3 rounded-[8px] border border-border
									p-3"
							>
								<span
									class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full
										bg-surface-container text-text-muted"
								>
									<Icon name="person" size={20} />
								</span>
								<div class="min-w-0 flex-1">
									<p class="text-body font-semibold text-text">
										{m.review_passenger_row({ number: summary.passengerIndex + 1 })}
										<span class="text-text-faint" aria-hidden="true"> · </span>
										<span class="text-mono-data text-text-muted">
											{m.seat_label({ seat: summary.seatId })}
										</span>
									</p>
									<div class="mt-1 flex flex-wrap gap-2">
										{#if summary.complete}
											<Badge tone="success" icon="check">
												{m.review_passenger_complete()}
											</Badge>
										{:else}
											<Badge tone="warning" icon="alert">
												{m.review_passenger_incomplete()}
											</Badge>
										{/if}
										{#if summary.concession !== 'none'}
											<Badge tone="primary">
												{m.review_passenger_concession({
													value: concessionLabel(summary.concession)
												})}
											</Badge>
										{/if}
										{#if summary.accessibility !== 'none'}
											<Badge tone="accent" icon="accessible">
												{m.review_passenger_assistance({
													value: accessibilityLabel(summary.accessibility)
												})}
											</Badge>
										{/if}
									</div>
								</div>
							</li>
						{/each}
					</ul>

					<div class="mt-4 border-t border-border pt-4">
						<h4 class="text-caps uppercase text-text-muted">{m.review_seats_title()}</h4>
						<p class="text-mono-data mt-1 text-title font-semibold text-text">
							{seats.join(', ')}
						</p>
						<a
							href={seatsHref}
							class="mt-1 inline-flex min-h-[44px] items-center gap-1.5 text-body-sm
								font-semibold text-primary-soft-text hover:underline"
						>
							{m.review_edit_seats()}
							<Icon name="chevron-right" size={16} />
						</a>
					</div>

					<div class="mt-4 border-t border-border pt-4">
						<h4 class="text-caps uppercase text-text-muted">{m.review_assistance_title()}</h4>
						{#if assistanceRequests.length === 0}
							<p class="mt-1 text-body-sm text-text-muted">{m.review_assistance_none()}</p>
						{:else}
							<ul class="mt-1 flex flex-col gap-1">
								{#each assistanceRequests as request (request.seatId)}
									<li class="text-body-sm text-text">
										{m.review_passenger_row({ number: request.passengerIndex + 1 })} ·
										{accessibilityLabel(request.accessibility)}
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				</section>
			</div>

			<!-- Fare rail -->
			<div class="md:col-span-1">
				<FareSummary
					{fare}
					note={m.review_terms()}
					action={proceedAction}
					class="md:sticky md:top-24"
				/>
			</div>
		</div>

		<!-- Spacer for the mobile viewport bottom. -->
		<div class="h-4" aria-hidden="true"></div>
	</div>
{/if}

{#snippet exploreAction()}
	<Button href="/explore" variant="secondary" iconLeft="explore">
		{m.booking_back_to_explore()}
	</Button>
{/snippet}

{#snippet seatsAction()}
	<Button href={seatsHref} variant="secondary" iconLeft="seat">{m.booking_go_to_seats()}</Button>
{/snippet}

{#snippet proceedAction()}
	{#if !allComplete}
		<div class="rounded-[8px] border border-warning/40 bg-warning-soft p-3">
			<p class="text-body-sm font-semibold text-text">{m.review_incomplete_title()}</p>
			<p class="mt-1 text-body-sm text-text-muted">{m.review_incomplete_body()}</p>
			<Button href={passengersHref} variant="secondary" fullWidth class="mt-3">
				{m.review_edit_passengers()}
			</Button>
		</div>
	{:else}
		<Button href={paymentHref} size="lg" fullWidth iconRight="arrow-right">
			{m.review_proceed()}
		</Button>
	{/if}
{/snippet}
