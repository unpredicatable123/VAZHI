<script>
import { page } from '$app/state';
import * as m from '$lib/paraglide/messages';
import { session } from '$stores/session.svelte';
import { roleHome } from '$types/auth';
import { isWorkspacePath } from '$utils/route-access';
import WorkspaceSignOut from './WorkspaceSignOut.svelte';
import LanguageSelector from './LanguageSelector.svelte';
import Logo from './Logo.svelte';
import ThemeSelector from './ThemeSelector.svelte';
const homeHref = $derived(session.current ? roleHome[session.current.role] : '/');
/*
    Inside a workspace the traveller bottom bar stands down, and with it the
    profile sheet that carries Sign out. Crew and controllers would otherwise
    have no way to end a session on a phone, so the top bar carries one.
*/
const inWorkspace = $derived(isWorkspacePath(page.url.pathname));
</script>

<!--
	Mobile top bar. The Stitch export ships desktop screens only, so this is
	authored in the same civic-minimal language: brand on the left, the two
	global controls on the right, and destinations left to the bottom bar.
-->
<header class="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur md:hidden">
	<div class="flex h-14 items-center justify-between px-4">
		<a href={homeHref} class="flex items-center rounded-[8px] text-primary-soft-text" aria-label={m.app_name()}>
			<Logo />
		</a>
		<div class="flex items-center">
			<LanguageSelector />
			<ThemeSelector />
			{#if inWorkspace}
				<WorkspaceSignOut compact />
			{/if}
		</div>
	</div>
</header>
