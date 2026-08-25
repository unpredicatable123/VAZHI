<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';
	import type { IconName } from './icons';

	type Tone = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger';

	interface Props {
		tone?: Tone;
		icon?: IconName;
		/** Pills are used for status chips, squares for metadata chips. */
		shape?: 'pill' | 'square';
		class?: string;
		children: Snippet;
	}

	let { tone = 'neutral', icon, shape = 'square', class: className = '', children }: Props =
		$props();

	const tones: Record<Tone, string> = {
		neutral: 'bg-surface-container text-text-muted',
		primary: 'bg-primary-soft text-primary-soft-text',
		accent: 'bg-accent-soft text-primary-soft-text',
		success: 'bg-success-soft text-success',
		warning: 'bg-warning-soft text-warning',
		danger: 'bg-danger-soft text-danger'
	};
</script>

<span
	class={`inline-flex items-center gap-1.5 px-2 py-1 text-caps
		${shape === 'pill' ? 'rounded-full' : 'rounded-[6px]'}
		${tones[tone]} ${className}`}
>
	{#if icon}<Icon name={icon} size={14} strokeWidth={2} />{/if}
	{@render children()}
</span>
