<script lang="ts">
	import PasswordChangeForm from '$components/auth/PasswordChangeForm.svelte';
	import * as m from '$lib/paraglide/messages';
</script>

<svelte:head><title>{m.auth_password_title()} — {m.app_name()}</title></svelte:head>

<div class="shell-width flex w-full flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
	<header>
		<h2 class="text-headline-sm text-text md:text-headline">{m.auth_password_title()}</h2>
		<p class="mt-1 text-body-sm text-text-muted">{m.auth_password_subtitle()}</p>
	</header>
	<PasswordChangeForm />
</div>
