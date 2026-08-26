<script>
import Icon from '$components/primitives/Icon.svelte';
import Toggle from '$components/primitives/Toggle.svelte';
import * as m from '$lib/paraglide/messages';
import { preferences } from '$stores/preferences.svelte';
let { variant = 'inline', showCompanions = false, id = 'accessible-travel-mode' } = $props();
const enabled = $derived(preferences.accessibleTravelMode);
</script>

<div
	{id}
	class={variant === 'panel'
		? 'rounded-card border border-border bg-surface p-4 shadow-level-1'
		: 'border-t border-border pt-4'}
>
	<div class="flex items-start justify-between gap-3">
		<div class="flex items-start gap-3">
			<span class="mt-0.5 shrink-0 text-primary-soft-text">
				<Icon name="accessible" size={24} strokeWidth={1.8} />
			</span>
			<div>
				<span id="{id}-label" class="block text-body font-semibold text-text">
					{m.atm_title()}
				</span>
				<span id="{id}-desc" class="mt-0.5 block text-body-sm text-text-muted">
					{m.atm_description()}
				</span>
			</div>
		</div>

		<Toggle
			id="{id}-switch"
			checked={enabled}
			labelledBy="{id}-label"
			describedBy="{id}-desc"
			onchange={(next) => preferences.setAccessibleTravelMode(next)}
			class="-mr-2 shrink-0"
		/>
	</div>

	<!-- Announced separately so the state change is heard without moving focus. -->
	<p class="sr-only" aria-live="polite">{enabled ? m.atm_on() : m.atm_off()}</p>

	<p class="mt-2 pl-9 text-body-sm text-text-faint">{m.atm_no_medical()}</p>

	{#if showCompanions && enabled}
		<div class="mt-4 space-y-2 border-t border-border pt-4 pl-9">
			<div class="flex items-start justify-between gap-3">
				<div>
					<span id="{id}-text-label" class="block text-body text-text">
						{m.atm_larger_text()}
					</span>
					<span class="text-body-sm text-text-muted">{m.atm_larger_text_hint()}</span>
				</div>
				<Toggle
					id="{id}-text"
					checked={preferences.largerText}
					labelledBy="{id}-text-label"
					onchange={(next) => preferences.setLargerText(next)}
					class="-mr-2 shrink-0"
				/>
			</div>

			<div class="flex items-start justify-between gap-3">
				<div>
					<span id="{id}-motion-label" class="block text-body text-text">
						{m.atm_reduced_motion()}
					</span>
					<span class="text-body-sm text-text-muted">{m.atm_reduced_motion_hint()}</span>
				</div>
				<Toggle
					id="{id}-motion"
					checked={preferences.reducedMotion}
					labelledBy="{id}-motion-label"
					onchange={(next) => preferences.setReducedMotion(next)}
					class="-mr-2 shrink-0"
				/>
			</div>
		</div>
	{/if}
</div>
