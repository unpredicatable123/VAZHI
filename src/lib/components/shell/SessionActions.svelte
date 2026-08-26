<script>
import Icon from '$components/primitives/Icon.svelte';
import * as m from '$lib/paraglide/messages';
import { signOutAndRedirect } from '$services/session.actions';
import { session } from '$stores/session.svelte';
let { onnavigate } = $props();
let busy = $state(false);
async function signOutNow() {
    busy = true;
    await signOutAndRedirect(onnavigate);
    busy = false;
}
</script>

{#if session.isSignedIn}
	<div class="px-3 pt-2 pb-1">
		<p class="text-caps uppercase text-text-muted">{m.profile_account_label()}</p>
		<p class="mt-0.5 text-body-sm text-text">
			{m.role_signed_in_as({ name: session.current?.displayName ?? '' })}
		</p>
	</div>
	<button
		type="button"
		disabled={busy}
		onclick={signOutNow}
		class="flex min-h-[44px] w-full items-center gap-3 rounded-[8px] px-3 text-body text-text
			transition-colors hover:bg-surface-container disabled:opacity-60"
	>
		<Icon name="logout" size={20} class="text-text-muted" />
		{m.auth_sign_out()}
	</button>
{:else}
	<a
		href="/login"
		onclick={onnavigate}
		class="flex min-h-[44px] w-full items-center gap-3 rounded-[8px] px-3 text-body
			font-semibold text-primary-soft-text transition-colors hover:bg-surface-container"
	>
		<Icon name="lock" size={20} />
		{m.auth_sign_in()}
	</a>
{/if}
