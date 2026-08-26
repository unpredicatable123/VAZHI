<script>
import { page } from '$app/state';
import Icon from '$components/primitives/Icon.svelte';
import * as m from '$lib/paraglide/messages';
import MobileProfileSheet from './MobileProfileSheet.svelte';
import { session } from '$stores/session.svelte';
import { guestNavItems, isActive, navItems } from './nav-items';
const pathname = $derived(page.url.pathname);
const source = $derived(session.isSignedIn ? navItems : guestNavItems);
const items = $derived(source.filter((item) => item.mobile));
let profileOpen = $state(false);
</script>

<!-- Fixed bottom navigation for thumb reach (spec section 7):
     Home | Explore | My Trips | Profile -->
<nav
	aria-label={m.nav_mobile_label()}
	class="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface
		pb-[env(safe-area-inset-bottom)] shadow-level-2 md:hidden"
>
	<ul class="flex h-[72px] items-stretch justify-around px-2">
		{#each items as item (item.href)}
			{@const active = isActive(pathname, item.href)}
			<li class="flex flex-1">
				<a
					href={item.href}
					aria-current={active ? 'page' : undefined}
					class="mx-1 my-2 flex flex-1 flex-col items-center justify-center gap-1
						rounded-card px-2 transition-colors
						{active ? 'bg-primary-soft text-primary-soft-text' : 'text-text-muted'}"
				>
					<Icon name={item.icon} size={24} strokeWidth={active ? 2 : 1.7} />
					<span class="text-caps">{item.label()}</span>
				</a>
			</li>
		{/each}

		<li class="flex flex-1">
			<button
				type="button"
				onclick={() => (profileOpen = true)}
				aria-expanded={profileOpen}
				aria-haspopup="dialog"
				class="mx-1 my-2 flex flex-1 flex-col items-center justify-center gap-1 rounded-card
					px-2 text-text-muted transition-colors"
			>
				<Icon name="person" size={24} />
				<span class="text-caps">{m.nav_profile()}</span>
			</button>
		</li>
	</ul>
</nav>

<MobileProfileSheet open={profileOpen} onclose={() => (profileOpen = false)} />
