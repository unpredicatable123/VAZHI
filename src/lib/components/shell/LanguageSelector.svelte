<script>
import Icon from '$components/primitives/Icon.svelte';
import * as m from '$lib/paraglide/messages';
import { getLocale, locales, setLocale } from '$lib/paraglide/runtime';
let { variant = 'icon', hideLegend = false } = $props();
const labels = {
    en: () => m.language_en(),
    ta: () => m.language_ta()
};
const available = locales;
let current = $state('en');
// getLocale() reads the resolved locale, which is only meaningful once the
// client strategies have run.
$effect(() => {
    current = getLocale();
});
function choose(locale) {
    if (locale === current)
        return;
    setLocale(locale);
}
function cycle() {
    const next = available[(available.indexOf(current) + 1) % available.length];
    choose(next);
}
</script>

{#if variant === 'icon'}
	<button
		type="button"
		onclick={cycle}
		class="flex h-11 w-11 items-center justify-center rounded-full text-text-muted
			transition-colors hover:bg-surface-container hover:text-text"
		aria-label={`${m.language_choose()}: ${labels[current]()}`}
	>
		<Icon name="language" size={20} />
	</button>
{:else}
	<fieldset class="flex flex-col gap-2">
		<legend class={hideLegend ? 'sr-only' : 'mb-2 text-caps uppercase text-text-muted'}>{m.language_label()}</legend>
		<div class="flex gap-1 rounded-[8px] bg-surface-container p-1">
			{#each available as locale (locale)}
				<button
					type="button"
					onclick={() => choose(locale)}
					aria-pressed={current === locale}
					lang={locale}
					class="h-11 flex-1 rounded-[6px] text-body-sm font-semibold transition-colors
						{current === locale
						? 'bg-surface text-primary-soft-text shadow-level-1'
						: 'text-text-muted hover:text-text'}"
				>
					{labels[locale]()}
				</button>
			{/each}
		</div>
	</fieldset>
{/if}
