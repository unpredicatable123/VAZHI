<script lang="ts">
	import SignInForm from '$components/auth/SignInForm.svelte';
	import Button from '$components/primitives/Button.svelte';
	import * as m from '$lib/paraglide/messages';
</script>

<svelte:head>
	<title>{m.auth_driver_title()} — {m.app_name()}</title>
</svelte:head>

<div class="shell-width flex w-full flex-col items-center gap-5 px-4 py-12 md:px-6 md:py-16">
	<SignInForm role="driver" />

	<div class="flex flex-col items-center gap-1">
		<Button href="/conductor/login" variant="ghost">{m.auth_switch_to_conductor()}</Button>
		<Button href="/login" variant="ghost">{m.auth_back_to_roles()}</Button>
	</div>
</div>
