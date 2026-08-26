<script>
let { elevation = 1, radius = 'card', padding = 'md', interactive = false, as = 'div', class: className = '', children } = $props();
const paddings = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-4 md:p-6' };
const shadows = { 0: '', 1: 'shadow-level-1', 2: 'shadow-level-2' };
const classes = $derived([
    'bg-surface border border-border',
    radius === 'card' ? 'rounded-card' : 'rounded-sheet',
    shadows[elevation],
    paddings[padding],
    interactive ? 'transition-colors duration-150 hover:border-primary' : '',
    className
]
    .filter(Boolean)
    .join(' '));
export {};
</script>

<svelte:element this={as} class={classes}>
	{@render children()}
</svelte:element>
