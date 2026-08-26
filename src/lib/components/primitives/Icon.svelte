<script>
import { icons } from './icons';
let { name, size = 20, label, class: className = '', strokeWidth = 1.7 } = $props();
const shapes = $derived(icons[name]);
</script>

<svg
	class={className}
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	role={label ? 'img' : 'presentation'}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
	focusable="false"
>
	{#each shapes as shape, index (index)}
		{#if shape.c}
			<circle
				cx={shape.c[0]}
				cy={shape.c[1]}
				r={shape.c[2]}
				fill={shape.fill ? 'currentColor' : 'none'}
				stroke={shape.fill ? 'none' : 'currentColor'}
			/>
		{:else if shape.d}
			<path d={shape.d} fill={shape.fill ? 'currentColor' : 'none'} />
		{/if}
	{/each}
</svg>
