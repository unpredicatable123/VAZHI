<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** Level 1 is a resting card, level 2 a floating panel (DESIGN.md). */
		elevation?: 1 | 2 | 0;
		/** Cards take the 16px radius; sheets take 24px. */
		radius?: 'card' | 'sheet';
		padding?: 'none' | 'sm' | 'md' | 'lg';
		/** Adds the 1px primary stroke on hover used for interactive cards. */
		interactive?: boolean;
		as?: 'div' | 'article' | 'section' | 'li';
		class?: string;
		children: Snippet;
	}

	let {
		elevation = 1,
		radius = 'card',
		padding = 'md',
		interactive = false,
		as = 'div',
		class: className = '',
		children
	}: Props = $props();

	const paddings = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-4 md:p-6' };
	const shadows = { 0: '', 1: 'shadow-level-1', 2: 'shadow-level-2' };

	const classes = $derived(
		[
			'bg-surface border border-border',
			radius === 'card' ? 'rounded-card' : 'rounded-sheet',
			shadows[elevation],
			paddings[padding],
			interactive ? 'transition-colors duration-150 hover:border-primary' : '',
			className
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

<svelte:element this={as} class={classes}>
	{@render children()}
</svelte:element>
