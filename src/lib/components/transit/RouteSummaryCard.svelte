<script>
import Icon from '$components/primitives/Icon.svelte';
import * as m from '$lib/paraglide/messages';
import { getLocale } from '$lib/paraglide/runtime';
import { placeName } from '$utils/format';
let { origin, destination, summary, editHref } = $props();
const locale = $derived(getLocale());
</script>

<div
	class="pointer-events-auto flex items-start justify-between gap-3 rounded-card border
		border-border bg-surface/95 p-4 shadow-level-1 backdrop-blur"
>
	<div class="min-w-0">
		<p class="text-caps uppercase text-text-muted">{m.explore_route_label()}</p>
		<h2 class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-title text-text">
			<span>{origin ? placeName(origin, locale) : '—'}</span>
			<Icon name="arrow-right" size={18} class="text-text-muted" />
			<span>{destination ? placeName(destination, locale) : '—'}</span>
		</h2>
		{#if summary}
			<p class="mt-1 text-body-sm text-text-muted">{summary}</p>
		{/if}
	</div>

	<a
		href={editHref}
		aria-label={m.explore_edit_search()}
		class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full
			text-primary-soft-text transition-colors hover:bg-surface-container"
	>
		<Icon name="edit" size={20} />
	</a>
</div>
