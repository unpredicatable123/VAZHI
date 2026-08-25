<script lang="ts">
	import { page } from '$app/state';
	import * as m from '$lib/paraglide/messages';
	import { session } from '$stores/session.svelte';
	import { roleHome } from '$types/auth';
	import LanguageSelector from './LanguageSelector.svelte';
	import Logo from './Logo.svelte';
	import ProfileMenu from './ProfileMenu.svelte';
	import ThemeSelector from './ThemeSelector.svelte';
	import { guestNavItems, isActive, navItems } from './nav-items';

	const pathname = $derived(page.url.pathname);

	// Signed-out visitors keep discovery but not the account-bound entries.
	const items = $derived(session.isSignedIn ? navItems : guestNavItems);

	/**
	 * Crew and controllers get their destinations from their own workspace
	 * navigation, so the traveller links stand down for them — the brand and the
	 * global controls stay, keeping the shell recognisably VAZHI.
	 */
	const showTravellerNav = $derived(
		!session.current || session.current.role === 'traveller'
	);

	const homeHref = $derived(session.current ? roleHome[session.current.role] : '/');
</script>

<!--
	Desktop top navigation (spec section 7):
	VAZHI | Home | Explore | My Trips | Help | Language | Theme | Profile
	Hidden below md, where the bottom bar takes over.
-->
<header
	class="sticky top-0 z-40 hidden border-b border-border bg-background/95 backdrop-blur
		md:block"
>
	<div class="shell-width flex h-16 items-center justify-between gap-6 px-6">
		<div class="flex items-center gap-8">
			<a
				href={homeHref}
				class="flex items-center rounded-[8px] text-primary-soft-text"
				aria-label={m.app_name()}
			>
				<Logo />
			</a>

			{#if showTravellerNav}
				<nav aria-label={m.nav_primary_label()}>
				<ul class="flex items-center gap-1">
					{#each items as item (item.href)}
						{@const active = isActive(pathname, item.href)}
						<li>
							<a
								href={item.href}
								aria-current={active ? 'page' : undefined}
								class="flex min-h-[44px] items-center rounded-[8px] px-3 text-body-sm font-semibold
									transition-colors
									{active
									? 'text-primary-soft-text'
									: 'text-text-muted hover:bg-surface-container hover:text-text'}"
							>
								<span
									class="border-b-2 pb-1 {active ? 'border-primary' : 'border-transparent'}"
								>
									{item.label()}
								</span>
							</a>
						</li>
					{/each}
					</ul>
				</nav>
			{/if}
		</div>

		<div class="flex items-center gap-1">
			<LanguageSelector />
			<ThemeSelector />
			<ProfileMenu />
		</div>
	</div>
</header>
