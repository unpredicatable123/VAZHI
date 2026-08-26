<script>
import Icon from '$components/primitives/Icon.svelte';
import * as m from '$lib/paraglide/messages';
import LanguageSelector from './LanguageSelector.svelte';
import SessionActions from './SessionActions.svelte';
import ThemeSelector from './ThemeSelector.svelte';
import { profileLinksFor } from './nav-items';
import { session } from '$stores/session.svelte';
/**
 * Profile menu (spec section 7). The avatar is drawn locally rather than
 * loaded from an image host, and no account identity is displayed because
 * this build has no authentication.
 *
 * The destinations depend on the role: the account pages under `/account`
 * are traveller-only, so a driver or controller is offered the support
 * pages instead of links the route guard would bounce them out of.
 */
let open = $state(false);
let container = $state(null);
let triggerEl = $state(null);
let panelEl = $state(null);
const links = $derived(profileLinksFor(session.role));
function close(returnFocus = true) {
    if (!open)
        return;
    open = false;
    if (returnFocus)
        triggerEl?.focus();
}
function onKeydown(event) {
    if (event.key === 'Escape')
        close();
}
function onPointerDown(event) {
    if (!open || !container)
        return;
    if (!container.contains(event.target))
        close(false);
}
// Moves focus into the panel when it opens so keyboard users land inside it.
$effect(() => {
    if (!open || !panelEl)
        return;
    const first = panelEl.querySelector('a, button');
    first?.focus();
});
</script>

<svelte:window onkeydown={onKeydown} onpointerdown={onPointerDown} />

<div class="relative" bind:this={container}>
	<button
		bind:this={triggerEl}
		type="button"
		onclick={() => (open = !open)}
		aria-expanded={open}
		aria-haspopup="true"
		aria-controls="profile-menu-panel"
		aria-label={open ? m.profile_close() : m.profile_open()}
		class="flex h-11 w-11 items-center justify-center rounded-full transition-colors
			hover:bg-surface-container"
	>
		<!-- Locally drawn avatar; the Stitch export used a Google-hosted photo. -->
		<span
			class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full
				border border-border bg-surface-container text-text-muted"
		>
			<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
				<circle cx="12" cy="9" r="3.6" fill="currentColor" opacity="0.75" />
				<path d="M4.6 20.5a7.6 7.6 0 0 1 14.8 0z" fill="currentColor" opacity="0.75" />
			</svg>
		</span>
	</button>

	{#if open}
		<div
			id="profile-menu-panel"
			bind:this={panelEl}
			class="absolute right-0 z-50 mt-2 w-[288px] rounded-card border border-border
				bg-surface p-2 shadow-level-2"
		>
			<div class="border-b border-border pb-2">
				<SessionActions onnavigate={() => close(false)} />
			</div>

			<ul class="py-1">
				{#each links as link (link.href)}
					<li>
						<a
							href={link.href}
							onclick={() => close(false)}
							class="flex min-h-[44px] items-center gap-3 rounded-[8px] px-3 text-body
								text-text transition-colors hover:bg-surface-container"
						>
							<Icon name={link.icon} size={20} class="text-text-muted" />
							{link.label()}
						</a>
					</li>
				{/each}
			</ul>

			<div class="border-t border-border px-3 py-3">
				<LanguageSelector variant="menu" />
				<div class="mt-3">
					<ThemeSelector variant="menu" />
				</div>
			</div>
		</div>
	{/if}
</div>
