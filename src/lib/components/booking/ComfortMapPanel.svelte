<script>
import Icon from '$components/primitives/Icon.svelte';
import * as m from '$lib/paraglide/messages';
/**
 * Privacy-Safe Comfort Map (specification section 8).
 *
 * Combines the seat-state legend with the area-level signals. Every entry
 * describes a region of the deck; none of them describes a person. The
 * "Women passengers nearby" row is the anonymous aggregate the
 * specification mandates, shown with its required non-guarantee
 * disclaimer.
 */
</script>

<style>
	/* Mirrors the gangway floor drawn on the coach plan. */
	.seat-map-aisle-swatch {
		background-image: repeating-linear-gradient(
			90deg,
			var(--c-border) 0,
			var(--c-border) 1px,
			transparent 1px,
			transparent 5px
		);
		background-color: var(--c-surface-container);
	}
</style>

<section
	class="w-full rounded-card border border-border bg-surface p-4 shadow-level-1"
	aria-labelledby="comfort-map-title"
>
	<h2 id="comfort-map-title" class="border-b border-border pb-2 text-title text-text">
		{m.comfort_map_title()}
	</h2>

	<!-- Seat states -->
	<ul class="mt-3 flex flex-wrap gap-x-4 gap-y-2">
		<li class="flex items-center gap-2">
			<span
				class="relative h-5 w-5 rounded-[5px] border-2 border-border-strong bg-surface"
				aria-hidden="true"
			>
				<span class="absolute inset-y-0.5 right-0 w-[3px] rounded-[2px] bg-text opacity-45"></span>
			</span>
			<span class="text-caps uppercase text-text-muted">{m.seat_state_available()}</span>
		</li>
		<li class="flex items-center gap-2">
			<span
				class="flex h-4 w-4 items-center justify-center rounded-[4px] border-2 border-primary
					bg-primary text-on-primary"
				aria-hidden="true"
			>
				<Icon name="check" size={10} strokeWidth={3} />
			</span>
			<span class="text-caps uppercase text-text-muted">{m.seat_state_selected()}</span>
		</li>
		<li class="flex items-center gap-2">
			<span
				class="seat-hatch h-4 w-4 rounded-[4px] border-2 border-border"
				aria-hidden="true"
			></span>
			<span class="text-caps uppercase text-text-muted">{m.seat_state_unavailable()}</span>
		</li>
		<li class="flex items-center gap-2">
			<span
				class="h-4 w-4 rounded-[4px] border-2 border-primary bg-primary-soft"
				aria-hidden="true"
			></span>
			<span class="text-caps uppercase text-text-muted">{m.seat_state_recommended()}</span>
		</li>
	</ul>

	<!-- Area-level signals -->
	<h3 class="mt-4 border-t border-border pt-3 text-caps uppercase text-text-muted">
		{m.comfort_map_areas()}
	</h3>
	<ul class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
		<li class="flex items-center gap-2 text-body-sm text-text">
			<span class="shrink-0 text-primary-soft-text"><Icon name="accessible" size={16} /></span>
			{m.seat_signal_accessible()}
		</li>
		<li class="flex items-center gap-2 text-body-sm text-text">
			<span
				class="h-4 w-4 shrink-0 rounded-[4px] border-2 border-dashed border-primary/60
					bg-primary-soft"
				aria-hidden="true"
			></span>
			{m.seat_signal_entrance()}
		</li>
		<li class="flex items-center gap-2 text-body-sm text-text">
			<span
				class="h-2.5 w-5 shrink-0 rounded-[3px] bg-accent/35 ring-1 ring-inset ring-accent/70"
				aria-hidden="true"
			></span>
			{m.seat_signal_window()}
		</li>
		<li class="flex items-center gap-2 text-body-sm text-text">
			<span class="seat-map-aisle-swatch h-4 w-5 shrink-0 rounded-[3px]" aria-hidden="true"></span>
			{m.seat_signal_aisle()}
		</li>
		<li class="flex items-center gap-2 text-body-sm text-text">
			<span class="h-3 w-6 shrink-0 rounded-full bg-accent-soft" aria-hidden="true"></span>
			{m.seat_signal_quieter()}
		</li>
	</ul>

	<p class="mt-3 text-body-sm text-text-faint">{m.seats_plan_hint()}</p>

	<!-- Anonymous aggregate. Never identifies an individual passenger. -->
	<div class="mt-3 border-t border-border pt-3">
		<p class="flex items-center gap-2 text-body-sm text-text">
			<span class="h-2.5 w-2.5 shrink-0 rounded-full bg-accent" aria-hidden="true"></span>
			{m.comfort_map_women_nearby()}
		</p>
		<p class="mt-2 text-body-sm text-text-muted italic">{m.comfort_map_disclaimer()}</p>
		<p class="mt-2 flex items-start gap-2 text-body-sm text-text-faint">
			<span class="mt-0.5 shrink-0"><Icon name="shield" size={16} /></span>
			{m.comfort_map_privacy()}
		</p>
	</div>
</section>
