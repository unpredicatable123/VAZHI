<script lang="ts">
	import Icon from '$components/primitives/Icon.svelte';

	/**
	 * States plainly that a screen is running on simulated data.
	 *
	 * Used by the mock payment step and by live tracking, so the build never
	 * implies a gateway, a bank, or a transit feed it does not have.
	 */

	interface Props {
		title: string;
		body: string;
		class?: string;
	}

	let { title, body, class: className = '' }: Props = $props();
</script>

<div
	class={`flex items-start gap-3 rounded-[8px] border border-warning/40 bg-warning-soft p-3
		${className}`}
	role="note"
>
	<span class="mt-0.5 shrink-0 text-warning"><Icon name="info" size={18} /></span>
	<div>
		<p class="text-body-sm font-semibold text-text">{title}</p>
		<p class="mt-0.5 text-body-sm text-text-muted">{body}</p>
	</div>
</div>
