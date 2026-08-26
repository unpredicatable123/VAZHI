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
/** Area-level signals only — never anything about another traveller. */
const signalLabels = $derived([
    seat.signals.accessible ? m.seat_signal_accessible() : null,
    seat.signals.window ? m.seat_signal_window() : null,
    seat.signals.aisle ? m.seat_signal_aisle() : null,
    seat.signals.nearEntrance ? m.seat_signal_entrance() : null,
    seat.signals.quieter ? m.seat_signal_quieter() : null,
    seat.signals.womenNearby ? m.seat_signal_women_nearby() : null,
    traits?.extraLegroom ? m.seat_signal_legroom() : null,
    traits?.limitedRecline ? m.seat_signal_no_recline() : null
].filter(Boolean));
const accessibleName = $derived([m.seat_label({ seat: seat.id }), stateLabel, ...signalLabels].join('. '));
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
	title={signalLabels.length > 0 ? signalLabels.join(' · ') : stateLabel}
	onclick={() => onselect(seat.id)}
	class="seat group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px]
		border-2 transition-colors {visual}"
>
	<!-- Backrest on the rear edge: every seat faces the front of the coach. -->
	<span
		class="absolute inset-y-1 right-0.5 w-[5px] rounded-[3px] bg-current opacity-45"
		aria-hidden="true"
	></span>
	<!-- Armrests down both sides. -->
	<span
		class="absolute top-1 right-2 left-2.5 h-[3px] rounded-full bg-current opacity-30"
		aria-hidden="true"
	></span>
	<span
		class="absolute right-2 bottom-1 left-2.5 h-[3px] rounded-full bg-current opacity-30"
		aria-hidden="true"
	></span>

	{#if seat.signals.womenNearby && !isUnavailable}
		<!-- Anonymous area marker, in the light accent. Never drawn on a seat
		     someone already occupies. -->
		<span
			class="absolute top-1.5 left-1.5 h-1.5 w-1.5 rounded-full bg-accent"
			aria-hidden="true"
		></span>
	{/if}

	{#if seat.signals.accessible && !isUnavailable}
		<span
			class="absolute bottom-1 left-1 {state === 'selected'
				? 'text-on-primary'
				: 'text-primary-soft-text'}"
			aria-hidden="true"
		>
			<Icon name="accessible" size={11} strokeWidth={2.4} />
		</span>
	{/if}

	<span class="text-mono-data pr-1 text-[12px] leading-none font-semibold">{seat.id}</span>
</button>

<style>
	/* A seat lifts very slightly on hover — the design system asks for a stroke
	   change rather than a large lift, so this stays at one pixel. */
	.seat:not(:disabled):hover {
		transform: translateY(-1px);
	}

	@media (prefers-reduced-motion: reduce) {
		.seat:not(:disabled):hover {
			transform: none;
		}
	}

	:global(html[data-motion='reduced']) .seat:not(:disabled):hover {
		transform: none;
	}
</style>
