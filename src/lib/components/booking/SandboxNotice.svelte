<script>
import Icon from '$components/primitives/Icon.svelte';
let { title, body, class: className = '' } = $props();
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
