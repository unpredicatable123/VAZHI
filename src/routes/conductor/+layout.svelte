<script>
import { page } from '$app/state';
import WorkspaceNav from '$components/shell/WorkspaceNav.svelte';
import { session } from '$stores/session.svelte';
let { children } = $props();
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
