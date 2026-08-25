<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$components/primitives/Button.svelte';
	import Icon from '$components/primitives/Icon.svelte';
	import Input from '$components/primitives/Input.svelte';
	import * as m from '$lib/paraglide/messages';
	import { registerTraveller } from '$services/auth.service';
	import { session } from '$stores/session.svelte';
	import { toasts } from '$stores/toast.svelte';
	import { safeRedirectTarget } from '$utils/route-access';

	let displayName = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let submitting = $state(false);
	let formError = $state('');
	let nameError = $state('');
	let emailError = $state('');
	let passwordError = $state('');
	let confirmError = $state('');

	function resetErrors() {
		formError = '';
		nameError = '';
		emailError = '';
		passwordError = '';
		confirmError = '';
	}

	function validate(): boolean {
		resetErrors();
		if (displayName.trim().length < 2) nameError = m.auth_register_error_name();
		if (!/^\S+@\S+\.\S+$/.test(email.trim())) emailError = m.auth_register_error_email();
		if (password.length < 8) passwordError = m.auth_register_error_password();
		if (password !== confirmPassword) confirmError = m.auth_register_error_confirm();
		return !nameError && !emailError && !passwordError && !confirmError;
	}

	function messageFor(key: string): string {
		switch (key) {
			case 'auth_register_error_email_taken':
				return m.auth_register_error_email_taken();
			case 'auth_register_error_password':
				return m.auth_register_error_password();
			case 'auth_register_error_details':
				return m.auth_register_error_details();
			default:
				return m.auth_register_error_generic();
		}
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!validate()) return;
		submitting = true;
		const result = await registerTraveller({ displayName, email, password });
		submitting = false;
		if (result.status === 'error') {
			formError = messageFor(result.error.messageKey);
			password = '';
			confirmPassword = '';
			return;
		}

		session.start(result.data);
		toasts.show(m.auth_register_success({ name: result.data.displayName }), 'success');
		await goto(safeRedirectTarget(page.url.searchParams.get('redirectTo'), '/'), {
			replaceState: true
		});
	}
</script>

<div class="relative w-full max-w-md">
	<div class="auth-glow pointer-events-none absolute -inset-6 -z-10 rounded-[40px]" aria-hidden="true"></div>
	<form
		class="relative flex flex-col gap-5 overflow-hidden rounded-card border border-border bg-surface
			p-6 shadow-level-2 md:p-8"
		onsubmit={submit}
		novalidate
	>
		<span class="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary via-accent to-primary/40" aria-hidden="true"></span>
		<div class="flex flex-col items-center gap-2 pt-1 text-center">
			<span class="flex h-14 w-14 items-center justify-center rounded-[18px] bg-primary-soft text-primary-soft-text ring-1 ring-primary/20">
				<Icon name="person" size={26} />
			</span>
			<h2 class="text-headline-sm text-text">{m.auth_register_title()}</h2>
			<p class="text-body-sm text-text-muted">{m.auth_register_subtitle()}</p>
		</div>

		{#if formError}
			<div role="alert" class="rounded-[8px] border border-danger/40 bg-danger-soft px-3 py-2 text-body-sm text-danger">
				{formError}
			</div>
		{/if}

		<Input id="register-name" label={m.auth_register_name()} bind:value={displayName} type="text" autocomplete="name" icon="person" error={nameError || undefined} required />
		<Input id="register-email" label={m.auth_register_email()} bind:value={email} type="email" autocomplete="email" icon="person" error={emailError || undefined} required />
		<Input id="register-password" label={m.auth_password()} bind:value={password} type="password" autocomplete="new-password" icon="lock" hint={m.auth_register_password_hint()} error={passwordError || undefined} required />
		<Input id="register-confirm" label={m.auth_register_confirm_password()} bind:value={confirmPassword} type="password" autocomplete="new-password" icon="lock" error={confirmError || undefined} required />

		<Button type="submit" size="lg" fullWidth iconLeft="person" loading={submitting}>
			{m.auth_register_submit()}
		</Button>
		<p class="sr-only" aria-live="polite">{submitting ? m.auth_registering() : ''}</p>
		<p class="flex items-start gap-2 text-body-sm text-text-faint">
			<span class="mt-0.5 shrink-0"><Icon name="shield" size={16} /></span>
			{m.auth_register_privacy()}
		</p>
	</form>
</div>

<style>
	.auth-glow {
		background:
			radial-gradient(60% 50% at 20% 0%, color-mix(in srgb, var(--c-primary) 14%, transparent), transparent 70%),
			radial-gradient(55% 50% at 90% 100%, color-mix(in srgb, var(--c-accent) 20%, transparent), transparent 70%);
		filter: blur(18px);
	}
</style>
