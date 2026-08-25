<script lang="ts">
	interface Props {
		/** Any CSS length. */
		width?: string;
		height?: string;
		radius?: 'sm' | 'card' | 'full';
		class?: string;
	}

	let { width = '100%', height = '1rem', radius = 'sm', class: className = '' }: Props = $props();

	const radii = { sm: 'rounded-[6px]', card: 'rounded-card', full: 'rounded-full' };
</script>

<!-- Decorative: the surrounding region carries aria-busy and a status message. -->
<div
	class={`animate-pulse bg-surface-container ${radii[radius]} ${className}`}
	style="width: {width}; height: {height};"
	aria-hidden="true"
></div>
