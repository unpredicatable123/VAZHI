<script lang="ts">
	import Badge from '$components/primitives/Badge.svelte';
	import Button from '$components/primitives/Button.svelte';
	import EmptyState from '$components/primitives/EmptyState.svelte';
	import Icon from '$components/primitives/Icon.svelte';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import type { Locale } from '$types/preferences';
	import type { RefundStep } from '$types/booking';
	import { formatClock, formatFare, formatJourneyDate } from '$utils/format';
	import type { PageData } from './$types';

	/**
	 * Refund and Cancellation (specification section 10).
	 *
	 * The worked example is ₹410 paid, an ₹82 fee, and ₹328 back. All journey
	 * facts come from the booking record, so the retired "Express Line 42" and
	 * the stale 2023 dates in the Stitch export cannot reappear.
	 */

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const locale = $derived(getLocale() as Locale);
	const refund = $derived(data.refund);
	const booking = $derived(data.booking);

	function stepTitle(step: RefundStep): string {
		return (
			{
				refund_step_requested: m.refund_step_requested(),
				refund_step_confirmed: m.refund_step_confirmed(),
				refund_step_initiated: m.refund_step_initiated(),
				refund_step_bank: m.refund_step_bank(),
				refund_step_credited: m.refund_step_credited()
			}[step.titleKey] ?? step.titleKey
		);
	}

	function stepDetail(step: RefundStep): string {
		if (step.id === 'initiated') return m.refund_step_initiated_detail();
		if (step.id === 'bank') return m.refund_step_bank_detail();
		if (step.id === 'credited' && step.detail) {
			return m.refund_step_expected({ date: formatJourneyDate(step.detail, locale) });
		}
		return '';
	}
</script>

<svelte:head>
	<title>{m.refund_page_title()} — {m.app_name()}</title>
</svelte:head>

{#if !refund || !booking}
	<div class="shell-width w-full px-4 py-10 md:px-6">
		<EmptyState title={m.refund_error_title()} body={m.refund_error_body()} icon="payments" />
	</div>
{:else}
	<div class="shell-width flex w-full flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
		<header>
			<h2 class="text-headline-sm text-text md:text-headline">{m.refund_heading()}</h2>
			<p class="mt-1 text-body-sm text-text-muted">
				{m.refund_booking_id()}:
				<span class="text-mono-data text-text">{refund.pnr}</span>
			</p>
		</header>

		<div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
			<!-- Trip + estimate -->
			<div class="flex flex-col gap-6 lg:col-span-7">
				<section
					class="rounded-card border border-border bg-surface p-4 shadow-level-1 md:p-6"
					aria-labelledby="refund-trip"
				>
					<h3 id="refund-trip" class="text-title text-text">{m.refund_trip_summary()}</h3>

					<div class="mt-4 flex items-start gap-4 border-b border-border pb-4">
						<span
							class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px]
								bg-surface-container text-primary-soft-text"
						>
							<Icon name="bus" size={22} />
						</span>
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-start justify-between gap-2">
								<div>
									<p class="text-body font-semibold text-text">{booking.serviceName}</p>
									<p class="text-body-sm text-text-muted">
										{booking.originName} → {booking.destinationName}
									</p>
								</div>
								<Badge tone="danger" shape="pill">{m.refund_cancelled_badge()}</Badge>
							</div>
							<p class="text-mono-data mt-2 text-body-sm text-text-muted">
								{formatJourneyDate(booking.travelDate, locale)} · {formatClock(
									booking.departure
								)} · {booking.vehicleNumber}
							</p>
							<p class="text-mono-data text-body-sm text-text-muted">
								{m.review_platform({ platform: booking.boardingPlatform })} ·
								{m.confirmation_seats()} {booking.seatIds.join(', ')}
							</p>
						</div>
					</div>

					<div class="mt-4 rounded-[8px] bg-surface-container p-4">
						<h4 class="text-body font-semibold text-text">{m.refund_policy_title()}</h4>
						<p class="mt-1 text-body-sm text-text-muted">{m.refund_policy_body()}</p>
						<ul class="mt-2 list-inside list-disc space-y-1 text-body-sm text-text-muted">
							<li>{m.refund_policy_base()}</li>
							<li>{m.refund_policy_taxes()}</li>
							<li>
								{m.refund_policy_fee({
									fee: formatFare(refund.breakdown.cancellationFee, locale)
								})}
							</li>
						</ul>
					</div>
				</section>

				<section
					class="rounded-card border border-border bg-surface p-4 shadow-level-1 md:p-6"
					aria-labelledby="refund-estimate"
				>
					<h3 id="refund-estimate" class="text-title text-text">
						{m.refund_estimate_title()}
					</h3>

					<dl class="mt-4 flex flex-col gap-2">
						<div class="flex items-baseline justify-between gap-4">
							<dt class="text-body text-text-muted">{m.refund_total_paid()}</dt>
							<dd class="text-mono-data text-text">
								{formatFare(refund.breakdown.totalPaid, locale)}
							</dd>
						</div>
						<div class="flex items-baseline justify-between gap-4">
							<dt class="text-body text-danger">{m.refund_fee()}</dt>
							<dd class="text-mono-data text-danger">
								−{formatFare(refund.breakdown.cancellationFee, locale)}
							</dd>
						</div>
						<div
							class="mt-1 flex items-baseline justify-between gap-4 border-t border-border pt-3"
						>
							<dt class="text-title text-text">{m.refund_estimated()}</dt>
							<dd class="text-mono-data text-title font-bold text-primary-soft-text">
								{formatFare(refund.breakdown.estimatedRefund, locale)}
							</dd>
						</div>
					</dl>

					<p
						class="mt-4 flex items-start gap-2 rounded-[8px] bg-primary-soft p-3 text-body-sm
							text-primary-soft-text"
					>
						<span class="mt-0.5 shrink-0"><Icon name="info" size={18} /></span>
						{m.refund_processing_note()}
					</p>
				</section>
			</div>

			<!-- Timeline + support -->
			<div class="flex flex-col gap-6 lg:col-span-5">
				<section
					class="rounded-card border border-border bg-surface p-4 shadow-level-1 md:p-6"
					aria-labelledby="refund-status"
				>
					<h3 id="refund-status" class="text-title text-text">{m.refund_status_title()}</h3>

					<ol class="mt-4 flex flex-col">
						{#each refund.steps as step, index (step.id)}
							{@const isLast = index === refund.steps.length - 1}
							<li class="relative flex gap-4 {isLast ? '' : 'pb-6'}">
								{#if !isLast}
									<span
										class="absolute top-5 left-[9px] h-full w-0.5 {step.state === 'done'
											? 'bg-primary'
											: 'bg-border'}"
										aria-hidden="true"
									></span>
								{/if}
								<span
									class="relative z-10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center
										rounded-full border-2 bg-surface
										{step.state === 'pending' ? 'border-border-strong' : 'border-primary'}"
									aria-hidden="true"
								>
									{#if step.state === 'done'}
										<span class="h-2.5 w-2.5 rounded-full bg-primary"></span>
									{:else if step.state === 'active'}
										<span class="h-2.5 w-2.5 animate-pulse rounded-full bg-primary"></span>
									{/if}
								</span>
								<div class="min-w-0 flex-1">
									<p
										class="text-body font-semibold {step.state === 'active'
											? 'text-primary-soft-text'
											: step.state === 'done'
												? 'text-text'
												: 'text-text-muted'}"
									>
										{stepTitle(step)}
									</p>
									{#if stepDetail(step)}
										<p class="text-body-sm text-text-muted">{stepDetail(step)}</p>
									{/if}
								</div>
							</li>
						{/each}
					</ol>
				</section>

				<section
					class="flex flex-col items-center gap-3 rounded-card border border-border bg-surface
						p-6 text-center shadow-level-1"
					aria-labelledby="refund-support"
				>
					<span
						class="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft
							text-primary-soft-text"
					>
						<Icon name="help" size={26} />
					</span>
					<h3 id="refund-support" class="text-title text-text">{m.refund_support_title()}</h3>
					<p class="text-body-sm text-text-muted">{m.refund_support_body()}</p>
					<Button href="/help" variant="secondary" fullWidth iconLeft="help">
						{m.refund_support_action()}
					</Button>
				</section>

				<Button href="/trips" variant="ghost" fullWidth>{m.ticket_view_trips()}</Button>
			</div>
		</div>
	</div>
{/if}
