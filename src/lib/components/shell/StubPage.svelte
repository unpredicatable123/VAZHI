<script>
import Button from '$components/primitives/Button.svelte';
import EmptyState from '$components/primitives/EmptyState.svelte';
import * as m from '$lib/paraglide/messages';
let { title, body, icon = 'ticket' } = $props();
</script>

<svelte:head>
	<title>{title} — {m.app_name()}</title>
</svelte:head>

<div class="shell-width flex w-full flex-col gap-6 px-4 py-8 md:px-6 md:py-12">
	<div class="flex flex-col gap-2">
		<h1 class="text-headline-sm text-text md:text-headline">{title}</h1>
		<p class="text-body-sm text-text-muted">{m.stub_phase_note()}</p>
	</div>

	<EmptyState {title} {body} {icon} action={backAction} />
</div>

{#snippet backAction()}
	<Button href="/" variant="secondary" iconLeft="home">{m.nav_home()}</Button>
{/snippet}
