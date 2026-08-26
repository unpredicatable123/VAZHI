<script>
import Icon from '$components/primitives/Icon.svelte';
import * as m from '$lib/paraglide/messages';
import { bookingDraft } from '$stores/booking.svelte';
/**
 * Comfort Preferences (Stitch: seat type + assistance).
 *
 * These steer the seat recommendation engine only. No medical information
 * is requested here or anywhere else in the flow.
 */
const seatTypes = [
    { value: 'any', label: () => m.comfort_seat_any() },
    { value: 'window', label: () => m.comfort_seat_window() },
    { value: 'aisle', label: () => m.comfort_seat_aisle() }
];
const assistanceKinds = [
    { value: 'mobility', icon: 'accessible', label: () => m.comfort_assistance_mobility() },
    { value: 'visual', icon: 'sun', label: () => m.comfort_assistance_visual() },
    { value: 'hearing', icon: 'bell', label: () => m.comfort_assistance_hearing() }
];
</script>

<section
	class="rounded-card border border-border bg-surface p-4 shadow-level-1"
	aria-labelledby="comfort-prefs-title"
>
	<h2 id="comfort-prefs-title" class="text-title text-text">{m.comfort_prefs_title()}</h2>

	<fieldset class="mt-4">
		<legend class="mb-2 text-caps uppercase text-text-muted">
			{m.comfort_prefs_seat_type()}
		</legend>
		<div class="flex gap-2">
			{#each seatTypes as option (option.value)}
				{@const active = bookingDraft.comfort.seatType === option.value}
				<button
					type="button"
					aria-pressed={active}
					onclick={() => bookingDraft.setSeatType(option.value)}
					class="min-h-[44px] flex-1 rounded-[8px] border-2 px-3 text-body-sm transition-colors
						{active
						? 'border-primary bg-primary-soft font-semibold text-primary-soft-text'
						: 'border-border text-text hover:bg-surface-container'}"
				>
					{option.label()}
				</button>
			{/each}
		</div>
	</fieldset>

	<fieldset class="mt-4">
		<legend class="mb-2 text-caps uppercase text-text-muted">
			{m.comfort_prefs_assistance()}
		</legend>
		<div class="flex flex-wrap gap-2">
			{#each assistanceKinds as option (option.value)}
				{@const active = bookingDraft.comfort.assistance.includes(option.value)}
				<button
					type="button"
					aria-pressed={active}
					onclick={() => bookingDraft.toggleAssistance(option.value)}
					class="flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-body-sm
						transition-colors
						{active
						? 'border-primary bg-primary-soft font-semibold text-primary-soft-text'
						: 'border-border text-text hover:bg-surface-container'}"
				>
					<Icon name={option.icon} size={16} strokeWidth={active ? 2 : 1.7} />
					{option.label()}
				</button>
			{/each}
		</div>
	</fieldset>

	<p class="mt-3 text-body-sm text-text-faint">{m.comfort_prefs_no_medical()}</p>
</section>
