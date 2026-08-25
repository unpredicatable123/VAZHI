<script lang="ts">
	import Icon from '$components/primitives/Icon.svelte';
	import type { IconName } from '$components/primitives/icons';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import {
		activeFilterCount,
		applyFilters,
		coachOptions,
		coachOutcomes,
		fareThreshold,
		filterKeys,
		filterOutcomes
	} from '$services/search.service';
	import type { Locale } from '$types/preferences';
	import type { BusFilterKey, BusFilters, BusResult, CoachFilter } from '$types/transit';
	import { formatFare } from '$utils/format';

	/**
	 * The filter bar for the Explorer.
	 *
	 * Two kinds of control, because there are two kinds of question.
	 *
	 * COACH TYPE is a choice between three named states, drawn as a segmented
	 * control. It replaces a single "Seater" toggle that could only ever
	 * *exclude* sleepers — once sleeper services became bookable there was no
	 * way to ask for one, and a switch cannot express three answers.
	 *
	 * EVERYTHING ELSE is an independent on/off facet, drawn as toggle chips.
	 *
	 * Both carry the number of results they would leave, counted against
	 * whatever else is already on, so nothing is ever pressed blind. A toggle
	 * that would leave nothing — or change nothing — is stood down; a segment is
	 * stood down only when it would leave nothing, because a disabled segment in
	 * the middle of a control reads as broken.
	 *
	 * LAYOUT. One row that wraps, not a set of stacked labelled columns. The
	 * columns forced the chips into a narrow track where they stacked one per
	 * line, so a bar of five controls ate the height of the first result card.
	 * The group labels are carried by `aria-label` instead of headings: a
	 * segmented control and a row of chips do not need naming on screen, and
	 * the labels were most of the height they cost.
	 */

	interface Props {
		filters: BusFilters;
		/** The unfiltered results for this search — every count comes from it. */
		results: BusResult[];
		ontoggle: (key: BusFilterKey) => void;
		oncoach: (value: CoachFilter) => void;
		onclear: () => void;
	}

	let { filters, results, ontoggle, oncoach, onclear }: Props = $props();

	const locale = $derived(getLocale() as Locale);
	const outcomes = $derived(filterOutcomes(results, filters));
	const coach = $derived(coachOutcomes(results, filters));
	const priceCut = $derived(formatFare(fareThreshold(results), locale));

	const count = $derived(activeFilterCount(filters));
	const total = $derived(results.length);
	const showing = $derived(applyFilters(results, filters).length);

	interface Chip {
		key: BusFilterKey;
		icon: IconName;
		label: () => string;
		hint: () => string;
	}

	const chips: Chip[] = [
		{ key: 'time', icon: 'clock', label: () => m.filter_time(), hint: () => m.filter_time_hint() },
		{
			key: 'price',
			icon: 'payments',
			// The threshold is part of the label: a price filter that does not say
			// its price is asking to be pressed blind.
			label: () => m.filter_price_with_amount({ amount: priceCut }),
			hint: () => m.filter_price_hint({ amount: priceCut })
		},
		{ key: 'ac', icon: 'snowflake', label: () => m.filter_ac(), hint: () => m.filter_ac_hint() },
		{
			key: 'access',
			icon: 'accessible',
			label: () => m.filter_access(),
			hint: () => m.filter_access_hint()
		}
	];
	const orderedChips = $derived(filterKeys.map((key) => chips.find((chip) => chip.key === key)!));

	const coachMeta: Record<CoachFilter, { icon: IconName; label: () => string; hint: () => string }> =
		{
			all: { icon: 'sliders', label: () => m.filter_coach_all(), hint: () => m.filter_coach_all_hint() },
			seater: { icon: 'seat', label: () => m.filter_coach_seater(), hint: () => m.filter_coach_seater_hint() },
			sleeper: { icon: 'bolt', label: () => m.filter_coach_sleeper(), hint: () => m.filter_coach_sleeper_hint() }
		};
</script>

<div
	class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-border
		bg-surface px-3 py-2.5 shadow-level-1"
>
	<!-- ── Coach type ─────────────────────────────────────────────────── -->
	<div
		class="inline-flex shrink-0 rounded-full border border-border bg-surface-container p-0.5"
		role="radiogroup"
		aria-label={m.filter_coach_label()}
	>
		{#each coachOptions as option (option)}
			{@const meta = coachMeta[option]}
			{@const active = filters.coach === option}
			{@const outcome = coach[option]}
			<button
				type="button"
				role="radio"
				aria-checked={active}
				disabled={!outcome.available}
				title={outcome.available ? meta.hint() : m.filter_none_match()}
				onclick={() => oncoach(option)}
				class="flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-body-sm
					font-semibold whitespace-nowrap transition-colors
					{active
					? 'bg-surface text-text shadow-level-1'
					: outcome.available
						? 'text-text-muted hover:text-text'
						: 'cursor-not-allowed text-text-faint'}"
			>
				<Icon name={meta.icon} size={15} strokeWidth={active ? 2 : 1.7} />
				{meta.label()}
				<span
					aria-hidden="true"
					class="text-mono-data text-caps {active ? 'text-text-muted' : 'text-text-faint'}"
				>
					{outcome.count}
				</span>
			</button>
		{/each}
	</div>

	<!-- Divider between the choice and the facets. -->
	<span class="hidden h-6 w-px shrink-0 bg-border sm:block" aria-hidden="true"></span>

	<!-- ── Refinements ────────────────────────────────────────────────── -->
	{#each orderedChips as chip (chip.key)}
		{@const on = filters[chip.key]}
		{@const outcome = outcomes[chip.key]}
		{@const disabled = !outcome.available}
		<button
			type="button"
			aria-pressed={on}
			{disabled}
			title={disabled ? m.filter_none_match() : chip.hint()}
			onclick={() => ontoggle(chip.key)}
			class="flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border px-3.5
				text-body-sm font-medium whitespace-nowrap transition-colors
				{on
				? 'border-primary bg-primary-soft text-primary-soft-text'
				: disabled
					? 'cursor-not-allowed border-border bg-surface-container text-text-faint'
					: 'border-border-strong bg-surface text-text hover:border-primary'}"
		>
			<Icon name={chip.icon} size={15} strokeWidth={on ? 2 : 1.7} />
			{chip.label()}
			<span
				aria-hidden="true"
				class="text-mono-data rounded-full px-1.5 text-caps
					{on
					? 'bg-primary/15'
					: disabled
						? 'text-text-faint'
						: 'bg-surface-container text-text-muted'}"
			>
				{outcome.count}
			</span>
		</button>
	{/each}

	<!-- ── Result count and reset, pushed to the end of the row ───────── -->
	<div class="ml-auto flex shrink-0 items-center gap-2">
		<span class="text-body-sm whitespace-nowrap text-text-muted">
			{m.filter_showing({ count: showing, total })}
		</span>
		{#if count > 0}
			<button
				type="button"
				onclick={onclear}
				class="flex min-h-[44px] items-center gap-1.5 rounded-full px-2 text-body-sm
					font-semibold whitespace-nowrap text-primary-soft-text underline-offset-4
					hover:underline"
			>
				<Icon name="close" size={15} />
				{m.explore_filters_clear()}
			</button>
		{/if}
	</div>

	<!-- Announced without stealing focus as controls are pressed. -->
	<p class="sr-only" aria-live="polite">
		{m.filter_showing({ count: showing, total })}
		{#if count > 0}
			— {m.explore_active_filters({ count })}
		{/if}
	</p>
</div>
