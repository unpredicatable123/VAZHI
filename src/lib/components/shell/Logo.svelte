<script>
import { base } from '$app/paths';

let { class: className = '' } = $props();
const logoSrc = `${base}/vazhi-logo.png`;
let imageFailed = $state(false);
</script>

<!--
	The supplied product artwork is an opaque full-colour lockup. Keeping it on
	white preserves the intended navy/green palette in both themes.
	The containing link provides the accessible name, so this decorative image
	does not repeat "VAZHI" to screen readers.
-->
<span
	class={`relative inline-flex h-10 w-[85px] shrink-0 items-center justify-center overflow-hidden
		rounded-[6px] bg-white ring-1 ring-black/5 md:h-11 md:w-[94px] ${className}`}
>
	{#if imageFailed}
		<!-- This is mutually exclusive with the image so the two marks can never overlap. -->
		<span class="flex items-center gap-1 text-primary-soft-text" aria-hidden="true">
			<svg width="18" height="18" viewBox="0 0 32 32" focusable="false">
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
			<span class="text-body-sm font-bold tracking-tight">VAZHI</span>
		</span>
	{:else}
		<img
			src={logoSrc}
			alt=""
			width="1110"
			height="521"
			class="h-full w-full object-contain"
			loading="eager"
			fetchpriority="high"
			onerror={() => (imageFailed = true)}
		/>
	{/if}
</span>
