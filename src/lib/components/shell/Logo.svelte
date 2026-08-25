<script lang="ts">
	import * as m from '$lib/paraglide/messages';

	interface Props {
		class?: string;
	}

	let { class: className = '' }: Props = $props();
</script>

<span class={`inline-flex items-center gap-2 ${className}`}>
	<svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
		<path
			d="M8 9.5 16 23 24 9.5"
			fill="none"
			stroke="currentColor"
			stroke-width="3.4"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<circle cx="16" cy="12.4" r="2.2" fill="var(--c-accent)" />
	</svg>
	<span class="text-title font-bold tracking-tight">{m.app_name()}</span>
</span>
