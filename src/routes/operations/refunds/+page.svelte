<script lang="ts">
	import Badge from '$components/primitives/Badge.svelte';
	import Button from '$components/primitives/Button.svelte';
	import EmptyState from '$components/primitives/EmptyState.svelte';
	import Icon from '$components/primitives/Icon.svelte';
	import Skeleton from '$components/primitives/Skeleton.svelte';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import {
		listOperationsRefunds,
		approveOperationsRefund,
		rejectOperationsRefund
	} from '$services/refunds.service';
	import { toasts } from '$stores/toast.svelte';
	import type { Booking } from '$types/booking';
	import type { AsyncState } from '$types/common';
	import type { Locale } from '$types/preferences';
	import { formatClock, formatFare, formatJourneyDate } from '$utils/format';

	type FilterTab = 'pending' | 'approved' | 'rejected' | 'all';

	let bookings = $state<Booking[]>([]);
	let loadState = $state<AsyncState>('loading');
	let activeTab = $state<FilterTab>('pending');
	let processingPnr = $state<string | null>(null);
	let rejectReasonModalPnr = $state<string | null>(null);
	let rejectionReasonInput = $state<string>('');

	const locale = $derived(getLocale() as Locale);

	async function loadRefunds() {
		loadState = 'loading';
		const result = await listOperationsRefunds();
		if (result.status === 'ok') {
			bookings = result.data;
			loadState = 'ready';
		} else {
			loadState = 'error';
		}
	}

	$effect(() => {
		loadRefunds();
	});

	const counts = $derived({
		pending: bookings.filter(
			(b) => b.status === 'cancellation_pending' || b.refund?.status === 'pending_approval'
		).length,
		approved: bookings.filter((b) => b.refund?.status === 'approved' || b.status === 'cancelled')
			.length,
		rejected: bookings.filter((b) => b.refund?.status === 'rejected').length,
		all: bookings.length
	});

	const filteredBookings = $derived(
		bookings.filter((b) => {
			if (activeTab === 'pending') {
				return b.status === 'cancellation_pending' || b.refund?.status === 'pending_approval';
			}
			if (activeTab === 'approved') {
				return b.refund?.status === 'approved' || (b.status === 'cancelled' && b.refund?.status !== 'rejected');
			}
			if (activeTab === 'rejected') {
				return b.refund?.status === 'rejected';
			}
			return true;
		})
	);

	async function handleApprove(pnr: string) {
		processingPnr = pnr;
		const res = await approveOperationsRefund(pnr);
		processingPnr = null;

		if (res.status === 'ok') {
			toasts.show(`Refund for ${pnr} approved successfully.`, 'success');
			loadRefunds();
		} else {
			toasts.show(res.error.messageKey ?? 'Failed to approve refund', 'error');
		}
	}

	function openRejectModal(pnr: string) {
		rejectReasonModalPnr = pnr;
		rejectionReasonInput = '';
	}

	async function confirmReject() {
		if (!rejectReasonModalPnr) return;
		const pnr = rejectReasonModalPnr;
		const reason = rejectionReasonInput.trim() || 'Cancellation criteria not met';

		processingPnr = pnr;
		rejectReasonModalPnr = null;

		const res = await rejectOperationsRefund(pnr, reason);
		processingPnr = null;

		if (res.status === 'ok') {
			toasts.show(`Refund for ${pnr} rejected.`, 'info');
			loadRefunds();
		} else {
			toasts.show(res.error.messageKey ?? 'Failed to reject refund', 'error');
		}
	}
</script>

<svelte:head>
	<title>Refund Approvals — Operations — {m.app_name()}</title>
</svelte:head>

<div class="shell-width flex w-full flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
	<header class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h2 class="text-headline-sm text-text md:text-headline">Refund Approvals</h2>
			<p class="mt-1 text-body-sm text-text-muted">
				Review user cancellation requests and process refund approvals.
			</p>
		</div>
		<Button variant="ghost" iconLeft="refresh" onclick={loadRefunds}>Refresh</Button>
	</header>

	<!-- Filter Tabs -->
	<nav aria-label="Refund Filters" class="flex flex-wrap gap-2 border-b border-border pb-3">
		<button
			type="button"
			class="flex items-center gap-2 rounded-full px-4 py-2 text-body-sm font-semibold transition-colors
				{activeTab === 'pending'
				? 'bg-primary text-on-primary'
				: 'bg-surface-container text-text hover:bg-surface-container-high'}"
			onclick={() => (activeTab = 'pending')}
		>
			<span>Pending Approval</span>
			<span
				class="rounded-full px-2 py-0.5 text-caps
				{activeTab === 'pending' ? 'bg-on-primary/20 text-on-primary' : 'bg-warning-soft text-warning'}"
			>
				{counts.pending}
			</span>
		</button>

		<button
			type="button"
			class="flex items-center gap-2 rounded-full px-4 py-2 text-body-sm font-semibold transition-colors
				{activeTab === 'approved'
				? 'bg-primary text-on-primary'
				: 'bg-surface-container text-text hover:bg-surface-container-high'}"
			onclick={() => (activeTab = 'approved')}
		>
			<span>Approved</span>
			<span class="text-mono-data text-caps text-text-muted">{counts.approved}</span>
		</button>

		<button
			type="button"
			class="flex items-center gap-2 rounded-full px-4 py-2 text-body-sm font-semibold transition-colors
				{activeTab === 'rejected'
				? 'bg-primary text-on-primary'
				: 'bg-surface-container text-text hover:bg-surface-container-high'}"
			onclick={() => (activeTab = 'rejected')}
		>
			<span>Rejected</span>
			<span class="text-mono-data text-caps text-text-muted">{counts.rejected}</span>
		</button>

		<button
			type="button"
			class="flex items-center gap-2 rounded-full px-4 py-2 text-body-sm font-semibold transition-colors
				{activeTab === 'all'
				? 'bg-primary text-on-primary'
				: 'bg-surface-container text-text hover:bg-surface-container-high'}"
			onclick={() => (activeTab = 'all')}
		>
			<span>All Requests</span>
			<span class="text-mono-data text-caps text-text-muted">{counts.all}</span>
		</button>
	</nav>

	<!-- Content -->
	{#if loadState === 'loading'}
		<div class="flex flex-col gap-4">
			<Skeleton width="100%" height="140px" radius="card" />
			<Skeleton width="100%" height="140px" radius="card" />
		</div>
	{:else if filteredBookings.length === 0}
		<EmptyState
			title={activeTab === 'pending' ? 'No Pending Refund Requests' : 'No Refund Records'}
			body={activeTab === 'pending'
				? 'There are currently no cancellation requests awaiting operations review.'
				: 'No refund items match the selected filter.'}
			icon="payments"
		/>
	{:else}
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
			{#each filteredBookings as booking (booking.pnr)}
				{@const isPending =
					booking.status === 'cancellation_pending' || booking.refund?.status === 'pending_approval'}
				{@const isApproved =
					booking.refund?.status === 'approved' ||
					(booking.status === 'cancelled' && booking.refund?.status !== 'rejected')}
				{@const isRejected = booking.refund?.status === 'rejected'}

				<article
					class="flex flex-col rounded-card border border-border bg-surface p-5 shadow-level-1 transition-colors hover:border-border-strong"
				>
					<div class="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
						<div>
							<div class="flex items-center gap-2">
								<span class="text-mono-data font-bold text-text">{booking.pnr}</span>
								<Badge
									tone={isPending ? 'warning' : isApproved ? 'success' : 'danger'}
									shape="pill"
								>
									{isPending
										? 'Pending Approval'
										: isApproved
											? 'Refund Approved'
											: 'Request Rejected'}
								</Badge>
							</div>
							<p class="text-body-sm text-text-muted">{booking.serviceName} ({booking.vehicleNumber})</p>
						</div>
						<div class="text-right">
							<p class="text-mono-data text-title font-bold text-primary-soft-text">
								{formatFare(booking.refund?.breakdown?.estimatedRefund ?? Math.round(booking.fare.total * 0.8), locale)}
							</p>
							<p class="text-caps uppercase text-text-muted">Net Refund</p>
						</div>
					</div>

					<div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div>
							<p class="text-caps uppercase text-text-muted">Route</p>
							<p class="text-body font-semibold text-text">
								{booking.originName} → {booking.destinationName}
							</p>
							<p class="text-mono-data text-body-sm text-text-muted">
								{formatJourneyDate(booking.travelDate, locale)} at {formatClock(booking.departure)}
							</p>
						</div>

						<div>
							<p class="text-caps uppercase text-text-muted">Seats & Passengers</p>
							<p class="text-mono-data text-body text-text">
								{booking.seatIds.join(', ')} ({booking.passengerCount} seat{booking.passengerCount > 1 ? 's' : ''})
							</p>
							{#if booking.refund?.hoursBeforeDeparture}
								<p class="text-body-sm font-medium text-primary-soft-text">
									Requested {booking.refund.hoursBeforeDeparture}h before departure
								</p>
							{/if}
						</div>
					</div>

					<!-- Financial breakdown line -->
					<div class="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-[8px] bg-surface-container p-3 text-body-sm">
						<div>
							<span class="text-text-muted">Paid: </span>
							<span class="text-mono-data font-semibold text-text">{formatFare(booking.fare.total, locale)}</span>
						</div>
						<div>
							<span class="text-text-muted">Fee (20%): </span>
							<span class="text-mono-data font-semibold text-danger">−{formatFare(booking.refund?.breakdown?.cancellationFee ?? Math.round(booking.fare.total * 0.2), locale)}</span>
						</div>
						<div>
							<span class="text-text-muted">Refundable: </span>
							<span class="text-mono-data font-bold text-primary-soft-text">{formatFare(booking.refund?.breakdown?.estimatedRefund ?? Math.round(booking.fare.total * 0.8), locale)}</span>
						</div>
					</div>

					{#if isRejected && booking.refund?.rejectionReason}
						<div class="mt-3 rounded-[8px] bg-danger-soft p-3 text-body-sm text-danger">
							<span class="font-semibold">Rejection Reason: </span>
							{booking.refund.rejectionReason}
						</div>
					{/if}

					<!-- Action Buttons -->
					{#if isPending}
						<div class="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
							<Button
								variant="primary"
								iconLeft="check"
								loading={processingPnr === booking.pnr}
								onclick={() => handleApprove(booking.pnr)}
							>
								Approve Refund
							</Button>
							<Button
								variant="secondary"
								iconLeft="close"
								disabled={processingPnr === booking.pnr}
								onclick={() => openRejectModal(booking.pnr)}
								class="text-danger"
							>
								Reject
							</Button>
						</div>
					{/if}
				</article>
			{/each}
		</div>
	{/if}
</div>

<!-- Rejection Reason Modal -->
{#if rejectReasonModalPnr}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
	>
		<div class="w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-level-2">
			<h3 id="modal-title" class="text-title text-text">Reject Refund Request</h3>
			<p class="mt-1 text-body-sm text-text-muted">
				Specify a reason for rejecting refund request for booking <span class="text-mono-data font-bold">{rejectReasonModalPnr}</span>.
			</p>

			<textarea
				bind:value={rejectionReasonInput}
				placeholder="e.g. Cancellation condition violated or passenger checked in"
				class="mt-4 w-full rounded-[8px] border border-border bg-surface-container p-3 text-body text-text focus:outline-hidden focus:ring-2 focus:ring-primary"
				rows={3}
			></textarea>

			<div class="mt-4 flex justify-end gap-2">
				<Button variant="ghost" onclick={() => (rejectReasonModalPnr = null)}>Cancel</Button>
				<Button variant="danger" onclick={confirmReject}>Confirm Rejection</Button>
			</div>
		</div>
	</div>
{/if}

