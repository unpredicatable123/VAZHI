<script lang="ts">
	import { page } from '$app/state';
	import Icon from '$components/primitives/Icon.svelte';
	import type { UserRole } from '$types/auth';
	import WorkspaceSignOut from './WorkspaceSignOut.svelte';
	import { isActive, workspaceNavFor } from './nav-items';

	/**
	 * Navigation for an operational workspace.
	 *
	 * One component for all three workspaces — conductor, driver, operations —
	 * generalised from the conductor bar that came first. A horizontal strip on
	 * desktop and a fixed bottom bar on mobile, mirroring the traveller shell so
	 * a workspace still reads as VAZHI. Booking destinations never appear here.
	 *
	 * The destinations themselves come from `nav-items`, so adding a screen to a
	 * workspace is a one-line change in one file and no component has its own
	 * idea of where a role can go. Operations carries six destinations, which is
	 * why the mobile bar scrolls rather than squeezing them.
	 */

	interface Props {
		role: UserRole;
	}

	let { role }: Props = $props();

	const workspace = $derived(workspaceNavFor(role));
	const pathname = $derived(page.url.pathname);

	/** The workspace root must not light up on every child route. */
	function active(href: string, root: string): boolean {
		if (href === root) return pathname === root;
		return isActive(pathname, href);
	}
</script>

{#if workspace}
	<!-- Desktop / tablet -->
	<nav
		aria-label={workspace.label()}
		class="hidden border-b border-border bg-surface md:block"
	>
		<div class="shell-width flex items-center justify-between gap-4 px-6">
			<ul class="flex min-w-0 gap-1 overflow-x-auto">
				{#each workspace.items as item (item.href)}
					{@const current = active(item.href, workspace.root)}
					<li>
						<a
							href={item.href}
							aria-current={current ? 'page' : undefined}
							class="flex min-h-[44px] items-center gap-2 border-b-2 px-4 text-body-sm
								font-semibold whitespace-nowrap transition-colors
								{current
								? 'border-primary text-primary-soft-text'
								: 'border-transparent text-text-muted hover:bg-surface-container hover:text-text'}"
						>
							<Icon name={item.icon} size={18} />
							{item.label()}
						</a>
					</li>
				{/each}
			</ul>
			<WorkspaceSignOut />
		</div>
	</nav>

	<!-- Mobile: fixed bottom bar, thumb-reachable during a duty -->
	<nav
		aria-label={workspace.label()}
		class="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface
			pb-[env(safe-area-inset-bottom)] shadow-level-2 md:hidden"
	>
		<ul class="flex h-[72px] items-stretch overflow-x-auto px-2">
			{#each workspace.items as item (item.href)}
				{@const current = active(item.href, workspace.root)}
				<li class="flex min-w-[76px] flex-1">
					<a
						href={item.href}
						aria-current={current ? 'page' : undefined}
						class="mx-1 my-2 flex flex-1 flex-col items-center justify-center gap-1 rounded-card
							px-1 text-center transition-colors
							{current ? 'bg-primary-soft text-primary-soft-text' : 'text-text-muted'}"
					>
						<Icon name={item.icon} size={22} strokeWidth={current ? 2 : 1.7} />
						<span class="text-caps leading-tight">{item.label()}</span>
					</a>
				</li>
			{/each}
		</ul>
	</nav>
{/if}
