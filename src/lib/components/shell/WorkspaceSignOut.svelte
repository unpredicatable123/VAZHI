<script lang="ts">
	import Icon from '$components/primitives/Icon.svelte';
	import * as m from '$lib/paraglide/messages';
	import { signOutAndRedirect } from '$services/session.actions';
	import { session } from '$stores/session.svelte';

	/**
	 * Sign out, for the operational workspaces.
	 *
	 * A conductor, driver, or controller never sees the traveller profile menu —
	 * their workspace supplies its own chrome, and the traveller bottom bar
	 * stands down inside it. Without this control there was no way to sign out
	 * of a workspace on a phone at all, which is the one place it matters most:
	 * depot devices are shared, and the next person to pick one up would have
	 * inherited the previous shift's session.
	 *
	 * Two presentations, one behaviour. `compact` is an icon button for the
	 * mobile top bar, where space is scarce; the full form names the person and
	 * is used on the desktop workspace strip. Both call the same
	 * `signOutAndRedirect`, so a workspace can never clear less than the
	 * traveller menu does.
	 */

	interface Props {
		compact?: boolean;
	}

	let { compact = false }: Props = $props();

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
