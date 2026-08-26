<script>
import Icon from './Icon.svelte';
let { tone = 'neutral', icon, shape = 'square', class: className = '', children } = $props();
const tones = {
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
