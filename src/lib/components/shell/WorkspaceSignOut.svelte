<script>
import Icon from '$components/primitives/Icon.svelte';
import * as m from '$lib/paraglide/messages';
import { signOutAndRedirect } from '$services/session.actions';
import { session } from '$stores/session.svelte';
let { compact = false } = $props();
let busy = $state(false);
async function signOutNow() {
    busy = true;
    await signOutAndRedirect();
    busy = false;
}
</script>

{#if session.isSignedIn}
	{#if compact}
		<button
			type="button"
			disabled={busy}
			onclick={signOutNow}
			aria-label={m.auth_sign_out()}
			title={m.auth_sign_out()}
			class="flex h-11 w-11 items-center justify-center rounded-[8px] text-text-muted
				transition-colors hover:bg-surface-container hover:text-text disabled:opacity-60"
		>
			<Icon name="logout" size={20} />
		</button>
	{:else}
		<div class="flex items-center gap-3 pl-4">
			<span class="hidden text-body-sm text-text-muted lg:inline">
				{m.role_signed_in_as({ name: session.current?.displayName ?? '' })}
			</span>
			<button
				type="button"
				disabled={busy}
				onclick={signOutNow}
				class="flex min-h-[44px] items-center gap-2 rounded-[8px] px-3 text-body-sm
					font-semibold text-text-muted transition-colors hover:bg-surface-container
					hover:text-text disabled:opacity-60"
			>
				<Icon name="logout" size={18} />
				{m.auth_sign_out()}
			</button>
		</div>
	{/if}
{/if}
