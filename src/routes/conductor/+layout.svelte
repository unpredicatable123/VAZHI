<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import WorkspaceNav from '$components/shell/WorkspaceNav.svelte';
	import { session } from '$stores/session.svelte';

	/**
	 * Conductor workspace shell.
	 *
	 * Route protection itself lives in the root layout, which applies the
	 * central rules from `route-access` to every navigation. This layout only
	 * renders the workspace chrome, and holds content back until the session
	 * has been read so a conductor screen never flashes for the wrong role.
	 *
	 * The navigation bar is the shared `WorkspaceNav`, the same component the
	 * driver and operations workspaces use, with the destinations coming from
	 * `nav-items`.
	 */

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const isLoginRoute = $derived(page.url.pathname === '/conductor/login');
	const ready = $derived(session.initialised && (isLoginRoute || session.is('conductor')));
</script>

{#if !isLoginRoute}
	<WorkspaceNav role="conductor" />
{/if}

<!-- Extra bottom padding on mobile clears the fixed conductor nav bar. -->
<div class="flex flex-1 flex-col {isLoginRoute ? '' : 'pb-[88px] md:pb-0'}">
	{#if ready}
		{@render children()}
	{/if}
</div>
