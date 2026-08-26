<script>
import TravellerRegisterForm from '$components/auth/TravellerRegisterForm.svelte';
import Button from '$components/primitives/Button.svelte';
import * as m from '$lib/paraglide/messages';
</script>

<svelte:head>
	<title>{m.auth_register_title()} — {m.app_name()}</title>
</svelte:head>

<div class="shell-width flex w-full flex-col items-center gap-5 px-4 py-12 md:px-6 md:py-16">
	<TravellerRegisterForm />
	<div class="flex flex-col items-center gap-1">
		<p class="text-body-sm text-text-muted">{m.auth_register_have_account()}</p>
		<Button href="/login/traveller" variant="ghost">{m.auth_submit()}</Button>
		<Button href="/login" variant="ghost">{m.auth_back_to_roles()}</Button>
	</div>
</div>
