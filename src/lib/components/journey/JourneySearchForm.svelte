<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$components/primitives/Button.svelte';
	import Icon from '$components/primitives/Icon.svelte';
	import Select from '$components/primitives/Select.svelte';
	import * as m from '$lib/paraglide/messages';
	import { journeySearch, MAX_PASSENGERS, MIN_PASSENGERS } from '$stores/search.svelte';
	import { session } from '$stores/session.svelte';
	import { toasts } from '$stores/toast.svelte';
	import type { District, TransitStop } from '$types/transit';
	import { todayIso } from '$utils/format';
	import { signInPathFor, withRedirectTo } from '$utils/route-access';
	import AccessibleTravelModeCard from './AccessibleTravelModeCard.svelte';
	import LocationSelect from './LocationSelect.svelte';

	/**
	 * Journey search (spec section 10, Home).
	 *
	 * Collects From, To, Date, passenger count, and Accessible Travel Mode. Only
	 * these non-identifying values reach the URL on submit.
	 */

	interface Props {
		stops: TransitStop[];
		districts: District[];
		/** Renders the accessible-mode row inside the card, as on Home. */
		showAccessibleMode?: boolean;
		submitLabel?: string;
	}

	let { stops, districts, showAccessibleMode = true, submitLabel }: Props = $props();

	let submitting = $state(false);
	let errors = $state<{ from?: string; to?: string; date?: string }>({});
	let errorSummary = $state<HTMLDivElement | null>(null);

	const passengerOptions = $derived(
		Array.from({ length: MAX_PASSENGERS - MIN_PASSENGERS + 1 }, (_, index) => {
			const count = MIN_PASSENGERS + index;
			return {
				value: String(count),
				label: count === 1 ? m.search_passengers_option_one() : m.search_passengers_option({ count })
			};
		})
	);

	const hasErrors = $derived(Object.values(errors).some(Boolean));

	/**
	 * Drops a field's error the moment it is fixed.
	 *
	 * Leaving a red message under a field the traveller has just corrected
	 * reads as "still wrong" and sends them looking for a second mistake.
	 */
	function clearError(field: 'from' | 'to') {
		if (errors[field]) errors = { ...errors, [field]: undefined };
	}

	function validate(): boolean {
		const next: typeof errors = {};

		if (!journeySearch.originStopId) next.from = m.search_error_from_required();
		if (!journeySearch.destinationStopId) next.to = m.search_error_to_required();
		if (
			journeySearch.originStopId &&
			journeySearch.originStopId === journeySearch.destinationStopId
		) {
			next.to = m.search_error_same_stop();
		}
		if (!journeySearch.date) next.date = m.search_error_date_required();
		else if (journeySearch.date < todayIso()) next.date = m.search_error_date_past();

		errors = next;
		return Object.keys(next).length === 0;
	}

	async function onsubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!validate()) {
			// Move attention to the summary rather than silently failing.
			await Promise.resolve();
			errorSummary?.focus();
			return;
		}
		submitting = true;
		const target = `/explore?${journeySearch.toParams().toString()}`;

		// Searching starts a booking, so it needs a traveller session. The route
		// guard would catch this anyway; going straight to sign-in from here
		// avoids a bounce through a page the visitor is not allowed to see, and
		// `redirectTo` brings them back to these exact search criteria.
		if (!session.is('traveller')) {
			toasts.show(m.auth_sign_in_required(), 'info');
			await goto(withRedirectTo(signInPathFor('traveller'), target));
			submitting = false;
			return;
		}

		await goto(target);
		submitting = false;
	}
</script>

<form
	class="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 shadow-level-1 md:p-6"
	{onsubmit}
	novalidate
>
	<fieldset class="contents">
		<legend class="sr-only">{m.search_legend()}</legend>

		{#if hasErrors}
			<div
				bind:this={errorSummary}
				tabindex="-1"
				role="alert"
				class="rounded-[8px] border border-danger/40 bg-danger-soft px-3 py-2"
			>
				<p class="flex items-center gap-2 text-body-sm font-semibold text-danger">
					<Icon name="alert" size={16} />
					{m.search_error_title()}
				</p>
				<ul class="mt-1 list-inside list-disc text-body-sm text-text">
					{#each Object.values(errors).filter(Boolean) as message, index (index)}
						<li>{message}</li>
					{/each}
				</ul>
			</div>
		{/if}

		<!-- From / To with the swap control centred between them on desktop. -->
		<div class="relative grid grid-cols-1 gap-4 md:grid-cols-2">
			<LocationSelect
				id="journey-from"
				label={m.search_from_label()}
				bind:value={journeySearch.originStopId}
				{stops}
				{districts}
				icon="pin"
				error={errors.from}
				onselect={() => clearError('from')}
			/>

			<button
				type="button"
				onclick={() => journeySearch.swap()}
				aria-label={m.search_swap()}
				class="absolute top-[54px] left-1/2 z-20 hidden h-9 w-9 -translate-x-1/2
					items-center justify-center rounded-full border border-border-strong bg-surface
					text-primary-soft-text shadow-level-1 transition-colors
					hover:bg-surface-container md:flex"
			>
				<Icon name="swap" size={18} />
			</button>

			<LocationSelect
				id="journey-to"
				label={m.search_to_label()}
				bind:value={journeySearch.destinationStopId}
				{stops}
				{districts}
				icon="route"
				error={errors.to}
				onselect={() => clearError('to')}
			/>

			<!-- Mobile keeps the swap action as a full-width row so it stays a
			     comfortable target and does not overlap the fields. -->
			<button
				type="button"
				onclick={() => journeySearch.swap()}
				class="-my-1 flex min-h-[44px] items-center justify-center gap-2 rounded-[8px]
					text-body-sm font-semibold text-primary-soft-text hover:bg-surface-container md:hidden"
			>
				<Icon name="swap" size={18} />
				{m.search_swap()}
			</button>
		</div>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<div class="flex flex-col gap-2">
				<label class="text-caps uppercase text-text-muted" for="journey-date">
					{m.search_date_label()}
				</label>
				<div class="relative flex items-center">
					<span class="pointer-events-none absolute left-3 text-text-muted">
						<Icon name="calendar" size={20} />
					</span>
					<input
						id="journey-date"
						type="date"
						min={todayIso()}
						bind:value={journeySearch.date}
						aria-invalid={errors.date ? 'true' : undefined}
						aria-describedby={errors.date ? 'journey-date-error' : undefined}
						class="h-11 w-full rounded-[8px] border bg-background py-2 pr-3 pl-11 text-body
							text-text transition-colors focus:border-primary focus:outline-none
							focus:ring-2 focus:ring-primary/45
							{errors.date ? 'border-danger' : 'border-border-strong'}"
					/>
				</div>
				{#if errors.date}
					<p id="journey-date-error" class="flex items-center gap-1.5 text-body-sm text-danger">
						<Icon name="alert" size={16} />
						{errors.date}
					</p>
				{/if}
			</div>

			<Select
				id="journey-passengers"
				label={m.search_passengers_label()}
				value={String(journeySearch.passengers)}
				options={passengerOptions}
				icon="person"
				onchange={(value) => journeySearch.setPassengers(Number(value))}
			/>
		</div>

		{#if showAccessibleMode}
			<AccessibleTravelModeCard variant="inline" />
		{/if}

		<Button type="submit" size="lg" fullWidth iconLeft="search" loading={submitting}>
			{submitLabel ?? m.search_submit()}
		</Button>
	</fieldset>
</form>
