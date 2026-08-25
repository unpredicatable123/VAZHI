<script lang="ts">
	import SandboxNotice from '$components/booking/SandboxNotice.svelte';
	import Badge from '$components/primitives/Badge.svelte';
	import Button from '$components/primitives/Button.svelte';
	import EmptyState from '$components/primitives/EmptyState.svelte';
	import ErrorState from '$components/primitives/ErrorState.svelte';
	import Icon from '$components/primitives/Icon.svelte';
	import Spinner from '$components/primitives/Spinner.svelte';
	import TrackingProgress from '$components/tracking/TrackingProgress.svelte';
	import TransitMap from '$components/transit/TransitMap.svelte';
	import * as m from '$lib/paraglide/messages';
	import { routeIdForJourney } from '$services/routes.service';
	import { getTrackingSnapshot } from '$services/tracking.service';
	import { preferences } from '$stores/preferences.svelte';
	import { toasts } from '$stores/toast.svelte';
	import type { TrackingSnapshot } from '$types/booking';
	import type { AsyncState } from '$types/common';
	import type { PageData } from './$types';

	/**
	 * Live Tracking (specification section 10).
	 *
	 * SIMULATED. Position, speed, and progress are computed in the browser from
	 * the scheduled timetable and the bundled route geometry. No transit API,
	 * telemetry feed, or government service is contacted, and the screen says
	 * so rather than implying a live connection.
	 */

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let snapshot = $state<TrackingSnapshot | null>(null);
	let status = $state<AsyncState>('loading');

	const booking = $derived(data.booking);

	async function refresh() {
		if (!booking) return;
		const result = await getTrackingSnapshot(booking, fetch);
		if (result.status === 'error') {
			status = 'error';
			return;
		}
		snapshot = result.data;
		status = 'ready';
	}

	// Re-reads the simulated position on a timer. Reduced motion slows the tick
	// right down so the screen stays still for people who asked for that.
	$effect(() => {
		if (!booking) return;
		refresh();
		const interval = preferences.reducedMotion ? 60_000 : 15_000;
		const timer = setInterval(refresh, interval);
		return () => clearInterval(timer);
	});

	const progressPercent = $derived(snapshot ? Math.round(snapshot.progress * 100) : 0);

	async function share() {
		if (!booking) return;
		const url = `${location.origin}/trips/${booking.pnr}/track`;
		try {
			if (navigator.share) {
				await navigator.share({ title: m.app_name(), url });
			} else {
				await navigator.clipboard.writeText(url);
				toasts.show(m.tracking_share_copied(), 'success');
			}
		} catch {
			// Sharing can be dismissed or unavailable; nothing to recover.
		}
	}
</script>

<svelte:head>
	<title>{m.tracking_page_title()} — {m.app_name()}</title>
</svelte:head>

{#if !booking}
	<div class="shell-width w-full px-4 py-10 md:px-6">
		<EmptyState
			title={m.trips_empty_upcoming_title()}
			body={m.trips_empty_upcoming_body()}
			icon="pin"
		/>
	</div>
{:else}
	<div class="shell-width flex w-full flex-1 flex-col md:flex-row">
		<!-- Map: banner on mobile, the main canvas on desktop. -->
		<div
			class="relative border-b border-border md:sticky md:top-16 md:h-[calc(100vh-4rem)]
				md:flex-1 md:border-r md:border-b-0"
		>
			<TransitMap
				routeId={routeIdForJourney(booking.originStopId, booking.destinationStopId)}
				label={m.tracking_map_label()}
				vehicle={snapshot?.position ?? null}
				class="h-[240px] w-full md:h-full"
				overlay={mapOverlay}
			/>
		</div>

		<!-- Journey detail rail -->
		<aside
			class="flex w-full flex-col gap-4 px-4 py-6 md:w-[400px] md:shrink-0 md:px-6 md:py-8"
			aria-label={m.tracking_heading()}
		>
			<div>
				<div class="flex items-center justify-between gap-3">
					<span class="flex items-center gap-2 text-caps uppercase text-text-muted">
						<Icon name="bus" size={18} />
						{m.tracking_heading()}
					</span>
					{#if snapshot}
						<Badge tone={snapshot.delay === 'on_time' ? 'success' : 'warning'} shape="pill">
							{snapshot.delay === 'on_time'
								? m.tracking_status_on_time()
								: m.tracking_status_delayed({ minutes: snapshot.delayMinutes })}
						</Badge>
					{/if}
				</div>

				<h2 class="mt-2 text-headline-sm text-text">
					{m.tracking_route({
						origin: booking.originName,
						destination: booking.destinationName
					})}
				</h2>
				<p class="text-mono-data mt-1 text-body-sm text-text-muted">
					{booking.serviceName} · {booking.vehicleNumber}
				</p>
				<p class="text-mono-data text-body-sm text-text-muted">
					{m.ticket_pnr_label()} {booking.pnr} · {m.review_platform({
						platform: booking.boardingPlatform
					})}
				</p>
			</div>

			<SandboxNotice title={m.tracking_simulated_title()} body={m.tracking_simulated_body()} />

			{#if status === 'loading'}
				<div class="flex items-center gap-2 text-text-muted">
					<Spinner size={20} label={m.loading_label()} />
					<span class="text-body-sm">{m.loading_label()}</span>
				</div>
			{:else if status === 'error'}
				<ErrorState
					title={m.tracking_error_title()}
					body={m.tracking_error_body()}
					onRetry={refresh}
				/>
			{:else if snapshot}
				<!-- Metrics -->
				<div class="grid grid-cols-2 gap-3">
					<div class="rounded-card border border-border bg-surface p-4">
						<p class="text-caps uppercase text-text-muted">{m.tracking_distance_covered()}</p>
						<p class="text-mono-data mt-1 text-title font-semibold text-text">
							{snapshot.distanceCoveredKm}
							<span class="text-body-sm text-text-muted">{m.tracking_units_km()}</span>
						</p>
					</div>
					<div class="rounded-card border border-border bg-surface p-4">
						<p class="text-caps uppercase text-text-muted">
							{m.tracking_distance_remaining()}
						</p>
						<p class="text-mono-data mt-1 text-title font-semibold text-text">
							{snapshot.distanceRemainingKm}
							<span class="text-body-sm text-text-muted">{m.tracking_units_km()}</span>
						</p>
					</div>
				</div>

				<!-- Progress -->
				<section class="rounded-card border border-border bg-surface" aria-labelledby="progress-title">
					<div
						class="flex items-center justify-between gap-3 border-b border-border
							bg-surface-container px-4 py-3"
					>
						<h3 id="progress-title" class="text-body font-semibold text-text">
							{m.tracking_progress_title()}
						</h3>
						<div class="text-right">
							<p class="text-caps uppercase text-text-muted">{m.tracking_eta_label()}</p>
							<p class="text-mono-data font-bold text-primary-soft-text">
								{snapshot.etaArrival}
							</p>
						</div>
					</div>
					<div class="p-4">
						<TrackingProgress stops={snapshot.stops} etaArrival={snapshot.etaArrival} />
					</div>
				</section>

				<p class="sr-only" aria-live="polite">
					{m.tracking_vehicle_label({ progress: progressPercent })}
				</p>
			{/if}

			<Button fullWidth iconLeft="route" onclick={share} class="mt-auto">
				{m.tracking_share()}
			</Button>
			<Button href="/trips" variant="ghost" fullWidth>{m.ticket_view_trips()}</Button>
		</aside>
	</div>
{/if}

{#snippet mapOverlay()}
	{#if snapshot && snapshot.speedKmh > 0}
		<div class="mt-auto flex justify-center">
			<span
				class="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-primary px-3
					py-1.5 text-on-primary shadow-level-2"
			>
				<Icon name="bus" size={16} />
				<span class="text-mono-data text-[13px]">
					{snapshot.speedKmh} {m.tracking_units_kmh()}
				</span>
			</span>
		</div>
	{/if}
{/snippet}
