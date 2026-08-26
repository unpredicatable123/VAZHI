<script>
import Icon from '$components/primitives/Icon.svelte';
import * as m from '$lib/paraglide/messages';
import LanguageSelector from './LanguageSelector.svelte';
import SessionActions from './SessionActions.svelte';
import ThemeSelector from './ThemeSelector.svelte';
import { profileLinksFor } from './nav-items';
import { session } from '$stores/session.svelte';
let { open, onclose } = $props();
let panelEl = $state(null);
const links = $derived(profileLinksFor(session.role));
function onKeydown(event) {
    if (event.key === 'Escape')
        onclose();
}
$effect(() => {
    if (!open || !panelEl)
        return;
    panelEl.querySelector('a, button')?.focus();
});
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
	<!-- Bottom sheet: the mobile container pattern named in DESIGN.md. -->
	<div class="fixed inset-0 z-[70] md:hidden">
		<button
			type="button"
			class="absolute inset-0 bg-black/40"
			aria-label={m.action_close()}
			onclick={onclose}
		></button>

		<div
			bind:this={panelEl}
			role="dialog"
			aria-modal="true"
			aria-label={m.nav_profile()}
			class="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-sheet
				border-t border-border bg-surface pb-8 shadow-level-2"
		>
			<div class="sticky top-0 flex items-center justify-between gap-4 border-b border-border
				bg-surface px-4 pt-3 pb-3">
				<p class="text-title text-text">{m.nav_profile()}</p>
				<button
					type="button"
					onclick={onclose}
					aria-label={m.action_close()}
					class="flex h-11 w-11 items-center justify-center rounded-[8px] text-text-muted
						hover:bg-surface-container"
				>
					<Icon name="close" size={20} />
				</button>
			</div>

			<ul class="px-2 py-2">
				{#each links as link (link.href)}
					<li>
						<a
							href={link.href}
							onclick={onclose}
							class="flex min-h-[48px] items-center gap-3 rounded-[8px] px-3 text-body
								text-text transition-colors hover:bg-surface-container"
						>
							<Icon name={link.icon} size={20} class="text-text-muted" />
							{link.label()}
						</a>
					</li>
				{/each}
			</ul>

			<div class="border-t border-border px-4 py-4">
				<LanguageSelector variant="menu" />
				<div class="mt-4">
					<ThemeSelector variant="menu" />
				</div>
			</div>

			<div class="border-t border-border px-2 pt-2">
				<SessionActions onnavigate={onclose} />
			</div>
		</div>
	</div>
{/if}
