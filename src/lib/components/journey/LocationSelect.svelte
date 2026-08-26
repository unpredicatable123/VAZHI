<script>
import Icon from '$components/primitives/Icon.svelte';
import * as m from '$lib/paraglide/messages';
import { getLocale } from '$lib/paraglide/runtime';
import { findStop, groupStopsByDistrict } from '$services/stops.service';
import { placeName } from '$utils/format';
let { id, label, value = $bindable(), stops, districts, error, icon = 'pin', onselect } = $props();
const locale = $derived(getLocale());
let open = $state(false);
let query = $state('');
let activeIndex = $state(0);
let input = $state(null);
let listbox = $state(null);
let root = $state(null);
const selected = $derived(findStop(stops, value) ?? null);
const selectedDistrict = $derived(selected ? (districts.find((entry) => entry.id === selected.districtId) ?? null) : null);
const groups = $derived(groupStopsByDistrict(stops, districts, query));
/** The visible options in render order, for arrow-key movement. */
const flat = $derived(groups.flatMap((group) => group.stops));
const listboxId = $derived(`${id}-listbox`);
const optionId = (stopId) => `${id}-option-${stopId}`;
const kindLabel = (kind) => ({
    bus_stand: m.location_stop_kind_bus_stand(),
    terminal: m.location_stop_kind_terminal(),
    bypass: m.location_stop_kind_bypass(),
    waypoint: m.location_stop_kind_waypoint()
})[kind];
// Re-filtering can shorten the list under the cursor; keep it in range.
$effect(() => {
    const length = flat.length;
    if (activeIndex > length - 1)
        activeIndex = Math.max(0, length - 1);
});
function openPanel() {
    open = true;
    query = '';
    // Start on the current selection so arrowing continues from there.
    const index = flat.findIndex((stop) => stop.id === value);
    activeIndex = index >= 0 ? index : 0;
    queueMicrotask(() => input?.focus());
}
function closePanel(returnFocus = true) {
    if (!open)
        return;
    open = false;
    query = '';
    if (returnFocus)
        queueMicrotask(() => root?.querySelector('button')?.focus());
}
function choose(stop) {
    value = stop.id;
    onselect?.(stop.id);
    closePanel();
}
function move(delta) {
    if (flat.length === 0)
        return;
    activeIndex = (activeIndex + delta + flat.length) % flat.length;
    scrollActiveIntoView();
}
function scrollActiveIntoView() {
    queueMicrotask(() => {
        const stop = flat[activeIndex];
        if (!stop || !listbox)
            return;
        listbox.querySelector(`#${CSS.escape(optionId(stop.id))}`)?.scrollIntoView({
            block: 'nearest'
        });
    });
}
function onkeydown(event) {
    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault();
            move(1);
            break;
        case 'ArrowUp':
            event.preventDefault();
            move(-1);
            break;
        case 'Home':
            event.preventDefault();
            activeIndex = 0;
            scrollActiveIntoView();
            break;
        case 'End':
            event.preventDefault();
            activeIndex = Math.max(0, flat.length - 1);
            scrollActiveIntoView();
            break;
        case 'Enter': {
            event.preventDefault();
            const stop = flat[activeIndex];
            if (stop)
                choose(stop);
            break;
        }
        case 'Escape':
            event.preventDefault();
            closePanel();
            break;
        case 'Tab':
            closePanel(false);
            break;
    }
}
/** A click outside the field closes the panel, as a menu should. */
function onpointerdown(event) {
    if (!open || !root)
        return;
    if (!root.contains(event.target))
        closePanel(false);
}
</script>

<svelte:window onpointerdown={onpointerdown} />

<div class="relative flex flex-col gap-2" bind:this={root}>
	<span class="text-caps uppercase text-text-muted" id="{id}-label">{label}</span>

	<!-- Trigger: shows the current stop and the district it sits in. -->
	<button
		type="button"
		{id}
		onclick={() => (open ? closePanel() : openPanel())}
		aria-haspopup="dialog"
		aria-expanded={open}
		aria-labelledby="{id}-label {id}-value"
		aria-describedby={error ? `${id}-error` : undefined}
		class="flex min-h-[44px] w-full items-center gap-3 rounded-[8px] border bg-background px-3
			py-2 text-left transition-colors hover:border-primary focus:border-primary
			focus:outline-none focus:ring-2 focus:ring-primary/45
			{error ? 'border-danger' : 'border-border-strong'}"
	>
		<span class="shrink-0 text-text-muted"><Icon name={icon} size={20} /></span>
		<span class="min-w-0 flex-1" id="{id}-value">
			{#if selected}
				<span class="block truncate text-body text-text">{placeName(selected, locale)}</span>
				{#if selectedDistrict}
					<span class="block truncate text-body-sm text-text-muted">
						{placeName(selectedDistrict, locale)}
					</span>
				{/if}
			{:else}
				<span class="block truncate text-body text-text-faint">
					{m.location_none_selected()}
				</span>
			{/if}
		</span>
		<span class="shrink-0 text-text-muted"><Icon name="chevron-down" size={20} /></span>
	</button>

	{#if error}
		<p id="{id}-error" class="flex items-center gap-1.5 text-body-sm text-danger">
			<Icon name="alert" size={16} />
			{error}
		</p>
	{/if}

	{#if open}
		<!-- Backdrop, phone only: the panel becomes a bottom sheet there. -->
		<div class="fixed inset-0 z-[70] bg-surface-inverse/40 md:hidden" aria-hidden="true"></div>

		<div
			class="fixed inset-x-0 bottom-0 z-[80] flex max-h-[80vh] flex-col rounded-t-sheet border
			border-border bg-surface shadow-level-2
			md:absolute md:inset-x-auto md:bottom-auto md:mt-1 md:max-h-[380px] md:w-[min(28rem,90vw)]
			md:rounded-card"
			role="dialog"
			aria-label={label}
		>
			<div class="flex items-center gap-2 border-b border-border p-3">
			<span class="shrink-0 text-text-muted"><Icon name="search" size={20} /></span>
			<input
				bind:this={input}
				bind:value={query}
				{onkeydown}
				type="text"
				role="combobox"
				autocomplete="off"
				spellcheck="false"
				aria-expanded="true"
				aria-controls={listboxId}
				aria-autocomplete="list"
				aria-activedescendant={flat[activeIndex] ? optionId(flat[activeIndex].id) : undefined}
				aria-label={m.location_search_placeholder()}
				placeholder={m.location_search_placeholder()}
				class="h-11 min-w-0 flex-1 bg-transparent text-body text-text placeholder:text-text-faint
					focus:outline-none"
			/>
			{#if value}
				<button
					type="button"
					onclick={() => {
						value = '';
						input?.focus();
					}}
					aria-label={m.location_clear()}
					title={m.location_clear()}
					class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] text-text-muted
						transition-colors hover:bg-surface-container hover:text-text"
				>
					<Icon name="close" size={18} />
				</button>
			{/if}
			<button
				type="button"
				onclick={() => closePanel()}
				aria-label={m.location_close()}
				title={m.location_close()}
				class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] text-text-muted
					transition-colors hover:bg-surface-container hover:text-text md:hidden"
			>
				<Icon name="chevron-down" size={20} />
			</button>
			</div>

			<p class="sr-only" aria-live="polite">
			{flat.length === 1
				? m.location_results_count_one()
				: m.location_results_count({ count: flat.length })}
			</p>

			{#if flat.length === 0}
			<div class="flex flex-col gap-1 p-6 text-center">
				<p class="text-body text-text">{m.location_no_results({ query })}</p>
				<p class="text-body-sm text-text-muted">{m.location_no_results_hint()}</p>
			</div>
			{:else}
			<div
				bind:this={listbox}
				id={listboxId}
				role="listbox"
				aria-label={label}
				class="flex-1 overflow-y-auto overscroll-contain p-1"
			>
				{#each groups as group (group.district.id)}
					<div role="group" aria-labelledby="{id}-group-{group.district.id}">
						<p
							id="{id}-group-{group.district.id}"
							class="sticky top-0 z-10 bg-surface px-3 py-1.5 text-caps uppercase text-text-muted"
						>
							{placeName(group.district, locale)}
						</p>

						{#each group.stops as stop (stop.id)}
							{@const isActive = flat[activeIndex]?.id === stop.id}
							{@const isSelected = stop.id === value}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<div
								id={optionId(stop.id)}
								role="option"
								tabindex="-1"
								aria-selected={isSelected}
								onclick={() => choose(stop)}
								onpointermove={() => (activeIndex = flat.indexOf(stop))}
								class="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-[8px] px-3 py-2
									{isActive ? 'bg-primary-soft' : ''}"
							>
								<span class="w-5 shrink-0 text-primary-soft-text">
									{#if isSelected}
										<Icon name="check" size={18} />
									{/if}
								</span>
								<span class="min-w-0 flex-1">
									<span class="block truncate text-body text-text">
										{placeName(stop, locale)}
									</span>
									<span class="block truncate text-body-sm text-text-muted">
										{kindLabel(stop.kind)}
									</span>
								</span>
								</div>
						{/each}
					</div>
				{/each}
			</div>
			{/if}

			<p class="border-t border-border px-3 py-2 text-body-sm text-text-faint">
				{m.location_demo_note()}
			</p>
		</div>
	{/if}
</div>
