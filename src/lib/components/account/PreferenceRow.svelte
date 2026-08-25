<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '$components/primitives/Icon.svelte';
	import type { IconName } from '$components/primitives/icons';
	import Toggle from '$components/primitives/Toggle.svelte';

	/**
	 * One labelled preference. Either renders a switch, or a custom control
	 * passed in as a snippet (a select, for instance).
	 */

	interface Props {
		id: string;
		title: string;
		hint?: string;
		icon?: IconName;
		/** Omit when supplying a custom `control`. */
		checked?: boolean;
		onchange?: (value: boolean) => void;
		control?: Snippet;
		/** Tints the row, used for the primary accessibility setting. */
		highlighted?: boolean;
	}

	let {
		id,
		title,
		hint,
		icon,
		checked,
		onchange,
		control,
		highlighted = false
	}: Props = $props();
</script>

<div
	class="flex items-start justify-between gap-4 rounded-[8px] p-3
		{highlighted ? 'bg-surface-container' : ''}"
>
	<div class="flex min-w-0 items-start gap-3">
		{#if icon}
			<span class="mt-0.5 shrink-0 text-primary-soft-text"><Icon name={icon} size={20} /></span>
		{/if}
		<div class="min-w-0">
			<span id="{id}-label" class="block text-body font-semibold text-text">{title}</span>
			{#if hint}
				<span id="{id}-hint" class="mt-0.5 block text-body-sm text-text-muted">{hint}</span>
			{/if}
		</div>
	</div>

	<div class="shrink-0">
		{#if control}
			{@render control()}
		{:else if checked !== undefined}
			<Toggle
				{id}
				{checked}
				labelledBy="{id}-label"
				describedBy={hint ? `${id}-hint` : undefined}
				onchange={(value) => onchange?.(value)}
				class="-mr-2"
			/>
		{/if}
	</div>
</div>
