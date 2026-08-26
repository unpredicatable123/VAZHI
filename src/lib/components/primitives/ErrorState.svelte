<script>
import * as m from '$lib/paraglide/messages';
import Button from './Button.svelte';
import Icon from './Icon.svelte';
let { title, body, onRetry, class: className = '' } = $props();
</script>

<div
	role="alert"
	class={`flex flex-col items-center gap-3 rounded-card border border-danger/40 bg-danger-soft
		px-6 py-10 text-center ${className}`}
>
	<span class="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-danger">
		<Icon name="alert" size={24} />
	</span>
	<h2 class="text-title text-text">{title}</h2>
	{#if body}
		<p class="max-w-prose text-body-sm text-text-muted">{body}</p>
	{/if}
	{#if onRetry}
		<Button variant="secondary" iconLeft="refresh" onclick={onRetry} class="mt-2">
			{m.action_retry()}
		</Button>
	{/if}
</div>
