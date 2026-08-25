<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { toasts, type ToastTone } from '$stores/toast.svelte';
	import Icon from './Icon.svelte';
	import type { IconName } from './icons';

	const toneStyles: Record<ToastTone, string> = {
		info: 'border-border bg-surface text-text',
		success: 'border-success/40 bg-success-soft text-text',
		warning: 'border-warning/40 bg-warning-soft text-text',
		error: 'border-danger/40 bg-danger-soft text-text'
	};

	const toneIcons: Record<ToastTone, IconName> = {
		info: 'info',
		success: 'check',
		warning: 'alert',
		error: 'alert'
	};
</script>

<!-- Sits above the mobile bottom navigation so it never covers it. -->
<div
	class="pointer-events-none fixed inset-x-0 bottom-[88px] z-[60] flex flex-col items-center
		gap-2 px-4 md:bottom-6"
	role="region"
	aria-label={m.toast_region_label()}
>
	<div aria-live="polite" aria-atomic="false" class="contents">
		{#each toasts.items as toast (toast.id)}
			<div
				class={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-card border
					px-4 py-3 shadow-level-2 ${toneStyles[toast.tone]}`}
			>
				<span class="mt-0.5 shrink-0"><Icon name={toneIcons[toast.tone]} size={20} /></span>
				<p class="flex-1 text-body-sm">{toast.message}</p>
				<button
					type="button"
					class="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px]
						text-text-muted hover:bg-surface-container"
					onclick={() => toasts.dismiss(toast.id)}
					aria-label={m.action_dismiss()}
				>
					<Icon name="close" size={18} />
				</button>
			</div>
		{/each}
	</div>
</div>
