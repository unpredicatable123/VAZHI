<script>
import { navigating } from '$app/state';
import Icon from './Icon.svelte';
import Spinner from './Spinner.svelte';
let { variant = 'primary', size = 'md', href, type = 'button', disabled = false, loading = false, fullWidth = false, iconLeft, iconRight, class: className = '', onclick, children, ...rest } = $props();
// 44px minimum hit area on every variant (spec section 4).
const base = 'relative inline-flex items-center justify-center gap-2 rounded-[8px] font-semibold ' +
    'transition-colors duration-150 min-h-[44px] select-none ' +
    'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50';
const variants = {
    primary: 'bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active',
    secondary: 'border-[1.5px] border-primary text-primary-soft-text bg-transparent hover:bg-primary-soft',
    ghost: 'text-text-muted hover:bg-surface-container hover:text-text',
    danger: 'bg-danger text-white hover:opacity-90'
};
const sizes = {
    md: 'px-5 text-[15px]',
    lg: 'px-6 text-title'
};
const classes = $derived([base, variants[variant], sizes[size], fullWidth ? 'w-full' : '', className]
    .filter(Boolean)
    .join(' '));
const isInert = $derived(disabled || loading);
const showLoading = $derived(loading || Boolean(href && navigating.to));
</script>

{#if href}
	<a
		{href}
		class={classes}
		aria-disabled={isInert ? 'true' : undefined}
		tabindex={isInert ? -1 : undefined}
		{...rest}
	>
		{#if showLoading}
			<Spinner size={18} />
		{:else if iconLeft}
			<Icon name={iconLeft} size={20} />
		{/if}
		{@render children?.()}
		{#if iconRight && !showLoading}<Icon name={iconRight} size={20} />{/if}
	</a>
{:else}
	<button {type} class={classes} disabled={isInert} {onclick} {...rest}>
		{#if showLoading}
			<Spinner size={18} />
		{:else if iconLeft}
			<Icon name={iconLeft} size={20} />
		{/if}
		{@render children?.()}
		{#if iconRight && !showLoading}<Icon name={iconRight} size={20} />{/if}
	</button>
{/if}
