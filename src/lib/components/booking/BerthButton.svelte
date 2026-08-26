<script>
import Icon from '$components/primitives/Icon.svelte';
import * as m from '$lib/paraglide/messages';
let { seat, state, traits, onselect } = $props();
const stateLabel = $derived({
    available: m.seat_state_available(),
    selected: m.seat_state_selected(),
    unavailable: m.seat_state_unavailable(),
    recommended: m.seat_state_recommended()
}[state]);
const deckLabel = $derived(seat.berth === 'upper' ? m.sleeper_upper_deck() : m.sleeper_lower_deck());
/** Area-level signals only — never anything about another traveller. */
const signalLabels = $derived([
    deckLabel,
    seat.signals.accessible ? m.seat_signal_accessible() : null,
    seat.signals.window ? m.seat_signal_window() : null,
    seat.signals.aisle ? m.seat_signal_aisle() : null,
    seat.signals.nearEntrance ? m.seat_signal_entrance() : null,
    seat.signals.quieter ? m.seat_signal_quieter() : null,
    seat.signals.womenNearby ? m.seat_signal_women_nearby() : null,
    traits?.extraLegroom ? m.seat_signal_legroom() : null
].filter(Boolean));
const accessibleName = $derived([m.berth_label({ berth: seat.id }), stateLabel, ...signalLabels].join('. '));
const isUnavailable = $derived(state === 'unavailable');
const visual = $derived({
    selected: 'border-primary bg-primary text-on-primary shadow-level-1',
    recommended: 'border-primary bg-primary-soft text-primary-soft-text hover:bg-primary-soft',
    available: 'border-border-strong bg-surface text-text hover:border-primary',
    unavailable: 'seat-hatch border-border bg-surface text-text-faint cursor-not-allowed'
}[state]);
</script>

<button
	type="button"
	disabled={isUnavailable}
	aria-pressed={state === 'selected'}
	aria-label={accessibleName}
	title={signalLabels.join(' · ')}
	onclick={() => onselect(seat.id)}
	class="berth group relative flex h-10 w-[78px] shrink-0 items-center rounded-[13px]
		border-2 pr-2 pl-[26px] transition-colors {visual}"
>
	<!-- Pillow at the head end, on the left, so every berth faces the same way. -->
	<span
		class="absolute inset-y-[5px] left-[5px] w-[15px] rounded-[6px] border border-current
			bg-current opacity-30"
		aria-hidden="true"
	></span>

	<!-- Turned-back blanket edge across the foot end. -->
	<span
		class="absolute inset-y-[7px] right-[6px] w-[3px] rounded-full bg-current opacity-25"
		aria-hidden="true"
	></span>

	<!-- Side rail along the outer edge, as a bunk has. -->
	<span
		class="absolute right-2 bottom-[3px] left-[24px] h-[2px] rounded-full bg-current opacity-25"
		aria-hidden="true"
	></span>

	{#if seat.signals.womenNearby && !isUnavailable}
		<!-- Anonymous area marker. Never drawn on a berth someone occupies. -->
		<span class="absolute top-1 right-1.5 h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true"
		></span>
	{/if}

	{#if seat.signals.accessible && !isUnavailable}
		<span
			class="absolute bottom-0.5 right-1.5 {state === 'selected'
				? 'text-on-primary'
				: 'text-primary-soft-text'}"
			aria-hidden="true"
		>
			<Icon name="accessible" size={10} strokeWidth={2.4} />
		</span>
	{/if}

	<span class="text-mono-data text-[12px] leading-none font-semibold">{seat.id}</span>
</button>

<style>
	/* Matches the seat: a one-pixel lift, not a large one. */
	.berth:not(:disabled):hover {
		transform: translateY(-1px);
	}

	@media (prefers-reduced-motion: reduce) {
		.berth:not(:disabled):hover {
			transform: none;
		}
	}

	:global(html[data-motion='reduced']) .berth:not(:disabled):hover {
		transform: none;
	}
</style>
