<script>
import * as m from '$lib/paraglide/messages';
let { selected, counts, onselect } = $props();
const tabs = [
    { value: 'upcoming', label: () => m.trips_tab_upcoming() },
    { value: 'completed', label: () => m.trips_tab_completed() },
    { value: 'cancelled', label: () => m.trips_tab_cancelled() }
];
function onKeydown(event) {
    const index = tabs.findIndex((tab) => tab.value === selected);
    let next = index;
    if (event.key === 'ArrowRight')
        next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft')
        next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home')
        next = 0;
    else if (event.key === 'End')
        next = tabs.length - 1;
    else
        return;
    event.preventDefault();
    onselect(tabs[next].value);
    document.getElementById(`trip-tab-${tabs[next].value}`)?.focus();
}
</script>

<!-- Arrow-key handling sits on the tabs themselves: in the ARIA tabs pattern
     the tablist is not focusable, only the selected tab is. -->
<div role="tablist" aria-label={m.trips_heading()} class="flex border-b border-border">
	{#each tabs as tab (tab.value)}
		{@const active = selected === tab.value}
		<button
			id="trip-tab-{tab.value}"
			role="tab"
			type="button"
			aria-selected={active}
			aria-controls="trip-panel"
			tabindex={active ? 0 : -1}
			onclick={() => onselect(tab.value)}
			onkeydown={onKeydown}
			class="flex min-h-[44px] flex-1 items-center justify-center gap-2 border-b-2 px-4
				text-caps uppercase transition-colors md:flex-none
				{active
				? 'border-primary text-primary-soft-text'
				: 'border-transparent text-text-muted hover:bg-surface-container hover:text-text'}"
		>
			{tab.label()}
			<span class="text-mono-data text-[11px] text-text-faint">{counts[tab.value]}</span>
		</button>
	{/each}
</div>
