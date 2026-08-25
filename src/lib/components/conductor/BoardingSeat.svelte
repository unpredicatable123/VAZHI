<script lang="ts">
	import Icon from '$components/primitives/Icon.svelte';
	import * as m from '$lib/paraglide/messages';
	import type { SeatId } from '$types/booking';
	import type { SeatBoardingState } from '$types/conductor';

	/**
	 * One seat on the conductor's boarding plan.
	 *
	 * Drawn as the same piece of furniture as the traveller's seat — backrest
	 * on the rear edge, armrests down the sides — so the two screens read as
	 * the same coach. Only the colour meaning changes: here it is boarding
	 * state, not availability.
	 *
	 * PRIVACY: the face of the seat carries a seat code and a status glyph and
	 * nothing else. The booking reference is deliberately not printed on the
	 * plan — a coach diagram held up at the door should not broadcast which
	 * reference is sitting where. It appears only after the conductor
	 * deliberately opens a seat.
	 */

	interface Props {
		seatId: SeatId;
		boardingState: SeatBoardingState;
		selected: boolean;
		onselect: (seatId: SeatId) => void;
	}

	let { seatId, boardingState, selected, onselect }: Props = $props();

	let element = $state<HTMLButtonElement | null>(null);

	/**
	 * Bring a newly opened seat into view.
	 *
	 * The coach scrolls sideways on a narrow screen, so stepping to the next
	 * pending seat can land on one that is off the edge. Without this the
	 * selection would change silently and the conductor would be looking at the
	 * wrong part of the bus.
	 */
	$effect(() => {
		if (!selected || !element) return;
		const reduced =
			document.documentElement.dataset.motion === 'reduced' ||
			window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		element.scrollIntoView({
			behavior: reduced ? 'auto' : 'smooth',
			block: 'nearest',
			inline: 'center'
		});
	});

	const stateLabel = $derived(
		{
			boarded: m.conductor_seat_state_boarded(),
			pending: m.conductor_seat_state_pending(),
			cancelled: m.conductor_seat_state_cancelled(),
			available: m.conductor_seat_state_available()
		}[boardingState]
	);

	/** An empty seat has no booking to act on. */
	const actionable = $derived(boardingState !== 'available');

	const visual = $derived(
		{
			boarded: 'border-primary bg-primary text-on-primary shadow-level-1',
			pending: 'border-warning bg-warning-soft text-text hover:border-primary',
			cancelled: 'seat-hatch border-danger/50 bg-danger-soft text-text-muted',
			available: 'border-border-strong bg-surface text-text-faint cursor-not-allowed'
		}[boardingState]
	);
</script>

<button
	bind:this={element}
	type="button"
	disabled={!actionable}
	aria-pressed={selected}
	aria-label={m.conductor_seat_aria({ seat: seatId, status: stateLabel })}
	title={stateLabel}
	onclick={() => onselect(seatId)}
	class="boarding-seat relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px]
		border-2 transition-colors {visual}
		{selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface-container' : ''}"
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

	{#if boardingState === 'boarded'}
		<span class="absolute top-1 left-1" aria-hidden="true">
			<Icon name="check" size={11} strokeWidth={3} />
		</span>
	{:else if boardingState === 'cancelled'}
		<span class="absolute top-1 left-1 text-danger" aria-hidden="true">
			<Icon name="close" size={11} strokeWidth={3} />
		</span>
	{/if}

	<span class="text-mono-data pr-1 text-[12px] leading-none font-semibold">{seatId}</span>
</button>

<style>
	/* A seat lifts very slightly on hover, matching the traveller seat map. */
	.boarding-seat:not(:disabled):hover {
		transform: translateY(-1px);
	}

	@media (prefers-reduced-motion: reduce) {
		.boarding-seat:not(:disabled):hover {
			transform: none;
		}
	}

	:global(html[data-motion='reduced']) .boarding-seat:not(:disabled):hover {
		transform: none;
	}
</style>
