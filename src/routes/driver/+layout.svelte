<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import WorkspaceNav from '$components/shell/WorkspaceNav.svelte';
	import { session } from '$stores/session.svelte';

	/**
	 * Driver workspace shell.
	 *
	 * Route protection itself lives in the root layout, which applies the
	 * central rules from `route-access` to every navigation. This layout only
	 * renders the workspace chrome, and holds content back until the session has
	 * been read so a driver screen never flashes for the wrong role — the same
	 * arrangement the conductor workspace uses.
	 */

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const isLoginRoute = $derived(page.url.pathname === '/driver/login');
	const ready = $derived(session.initialised && (isLoginRoute || session.is('driver')));
</script>

{#if !isLoginRoute}
	<WorkspaceNav role="driver" />
{/if}

<!-- Extra bottom padding on mobile clears the fixed workspace nav bar. -->
<div class="flex flex-1 flex-col {isLoginRoute ? '' : 'pb-[88px] md:pb-0'}">
	{#if ready}
		{@render children()}
	{/if}
</div>
