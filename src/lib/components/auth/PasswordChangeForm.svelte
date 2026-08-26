<script>
import Button from '$components/primitives/Button.svelte';
import Icon from '$components/primitives/Icon.svelte';
import Input from '$components/primitives/Input.svelte';
import * as m from '$lib/paraglide/messages';
import { changeCurrentUserPassword } from '$services/auth.service';
import { toasts } from '$stores/toast.svelte';
let currentPassword = $state('');
let newPassword = $state('');
let confirmPassword = $state('');
let currentError = $state('');
let newError = $state('');
let confirmError = $state('');
let formError = $state('');
let saving = $state(false);
function validate() {
    currentError = currentPassword ? '' : m.auth_password_error_current_required();
    newError = newPassword.length >= 8 ? '' : m.auth_password_error_new();
    confirmError = newPassword === confirmPassword ? '' : m.auth_password_error_confirm();
    formError = '';
    return !currentError && !newError && !confirmError;
}
function messageFor(key) {
    switch (key) {
        case 'auth_password_error_current':
            return m.auth_password_error_current();
        case 'auth_password_error_new':
            return m.auth_password_error_new();
        case 'auth_password_error_sign_in':
            return m.auth_password_error_sign_in();
        default:
            return m.auth_password_error_generic();
    }
}
async function submit(event) {
    event.preventDefault();
    if (!validate())
        return;
    saving = true;
    const result = await changeCurrentUserPassword({ currentPassword, newPassword });
    saving = false;
    if (result.status === 'error') {
        formError = messageFor(result.error.messageKey);
        currentPassword = '';
        return;
    }
    currentPassword = '';
    newPassword = '';
    confirmPassword = '';
    toasts.show(m.auth_password_success(), 'success');
}
</script>

<form
	class="flex max-w-xl flex-col gap-5 rounded-card border border-border bg-surface p-5 shadow-level-1 md:p-6"
	onsubmit={submit}
	novalidate
>
	{#if formError}
		<div role="alert" class="rounded-[8px] border border-danger/40 bg-danger-soft px-3 py-2 text-body-sm text-danger">
			{formError}
		</div>
	{/if}

	<Input id="current-password" label={m.auth_password_current()} bind:value={currentPassword} type="password" autocomplete="current-password" icon="lock" error={currentError || undefined} required />
	<Input id="new-password" label={m.auth_password_new()} bind:value={newPassword} type="password" autocomplete="new-password" icon="lock" hint={m.auth_password_new_hint()} error={newError || undefined} required />
	<Input id="confirm-new-password" label={m.auth_password_confirm_new()} bind:value={confirmPassword} type="password" autocomplete="new-password" icon="lock" error={confirmError || undefined} required />

	<Button type="submit" iconLeft="lock" loading={saving}>{m.auth_password_update()}</Button>
	<p class="flex items-start gap-2 text-body-sm text-text-faint">
		<span class="mt-0.5 shrink-0"><Icon name="shield" size={16} /></span>
		{m.auth_password_security_note()}
	</p>
</form>
