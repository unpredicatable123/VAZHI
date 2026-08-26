<script>
let { size = 24, label, class: className = '' } = $props();
</script>

<span class={`inline-flex items-center gap-2 ${className}`}>
	<svg
		class="animate-spin"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		role={label ? 'img' : 'presentation'}
		aria-label={label}
		aria-hidden={label ? undefined : 'true'}
	>
		<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.4" opacity="0.22" />
		<path
			d="M21 12a9 9 0 0 0-9-9"
			stroke="currentColor"
			stroke-width="2.4"
			stroke-linecap="round"
		/>
	</svg>
	{#if label}<span class="sr-only">{label}</span>{/if}
</span>
