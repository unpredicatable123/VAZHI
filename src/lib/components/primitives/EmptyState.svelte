<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';
	import type { IconName } from './icons';

	interface Props {
		title: string;
		body?: string;
		icon?: IconName;
		/** Optional action row, typically a Button. */
		action?: Snippet;
		class?: string;
	}

	let { title, body, icon = 'search', action, class: className = '' }: Props = $props();
</script>

<div
	class={`flex flex-col items-center gap-3 rounded-card border border-dashed border-border
		bg-surface px-6 py-12 text-center ${className}`}
>
	<span class="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-text-muted">
		<Icon name={icon} size={24} />
	</span>
	<h2 class="text-title text-text">{title}</h2>
	{#if body}
		<p class="max-w-prose text-body-sm text-text-muted">{body}</p>
	{/if}
	{#if action}
		<div class="mt-2">{@render action()}</div>
	{/if}
</div>
