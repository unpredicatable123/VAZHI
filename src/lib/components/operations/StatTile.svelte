<script>
import Icon from '$components/primitives/Icon.svelte';
let { label, value, icon, tone = 'neutral', href, class: className = '' } = $props();
const accents = {
    neutral: 'text-text-muted',
    primary: 'text-primary-soft-text',
    accent: 'text-primary-soft-text',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger'
};
const base = 'flex flex-col gap-1 rounded-card border border-border bg-surface p-4 shadow-level-1';
const interactive = 'transition-colors hover:border-primary focus-visible:border-primary';
</script>

{#if href}
	<a {href} class={`${base} ${interactive} ${className}`}>
		<span class="flex items-center gap-2 text-caps uppercase text-text-muted">
			{#if icon}<span class={accents[tone]}><Icon name={icon} size={16} /></span>{/if}
			{label}
		</span>
		<span class="text-mono-data text-headline-sm font-bold text-text">{value}</span>
	</a>
{:else}
	<div class={`${base} ${className}`}>
		<span class="flex items-center gap-2 text-caps uppercase text-text-muted">
			{#if icon}<span class={accents[tone]}><Icon name={icon} size={16} /></span>{/if}
			{label}
		</span>
		<span class="text-mono-data text-headline-sm font-bold text-text">{value}</span>
	</div>
{/if}
