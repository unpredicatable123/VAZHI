<script>
import { page } from '$app/state';
import WorkspaceNav from '$components/shell/WorkspaceNav.svelte';
import { session } from '$stores/session.svelte';
let { children } = $props();
const isLoginRoute = $derived(page.url.pathname === '/operations/login');
const ready = $derived(session.initialised && (isLoginRoute || session.is('operations')));
</script>

{#if !isLoginRoute}
	<WorkspaceNav role="operations" />
{/if}

<!-- Extra bottom padding on mobile clears the fixed workspace nav bar. -->
<div class="flex flex-1 flex-col {isLoginRoute ? '' : 'pb-[88px] md:pb-0'}">
	{#if ready}
		{@render children()}
	{/if}
</div>
