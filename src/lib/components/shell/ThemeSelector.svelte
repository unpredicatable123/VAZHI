<script lang="ts">
	import Icon from '$components/primitives/Icon.svelte';
	import type { IconName } from '$components/primitives/icons';
	import * as m from '$lib/paraglide/messages';
	import { theme } from '$stores/theme.svelte';
	import type { ThemeMode } from '$types/preferences';

	interface Props {
		/** `menu` renders inline rows for the profile sheet; `icon` renders the
		 *  compact header control. */
		variant?: 'icon' | 'menu';
		/** Hide the built-in legend when the surrounding page already labels it. */
		hideLegend?: boolean;
	}

	let { variant = 'icon', hideLegend = false }: Props = $props();

	const options: { mode: ThemeMode; icon: IconName; label: () => string }[] = [
		{ mode: 'light', icon: 'sun', label: () => m.theme_light() },
		{ mode: 'dark', icon: 'moon', label: () => m.theme_dark() },
		{ mode: 'system', icon: 'monitor', label: () => m.theme_system() }
	];

	const currentIcon = $derived<IconName>(theme.resolved === 'dark' ? 'moon' : 'sun');

	/** The header control steps Light → Dark → System so it stays a single
	 *  44px target while still reaching every mode. */
	function cycle() {
		const order: ThemeMode[] = ['light', 'dark', 'system'];
		const next = order[(order.indexOf(theme.mode) + 1) % order.length];
		theme.set(next);
	}

	const currentLabel = $derived(
		options.find((option) => option.mode === theme.mode)?.label() ?? m.theme_system()
	);
</script>

{#if variant === 'icon'}
	<button
		type="button"
		onclick={cycle}
		class="flex h-11 w-11 items-center justify-center rounded-full text-text-muted
			transition-colors hover:bg-surface-container hover:text-text"
		aria-label={`${m.theme_choose()}: ${currentLabel}`}
	>
		<Icon name={currentIcon} size={20} />
	</button>
{:else}
	<fieldset class="flex flex-col gap-2">
		<legend class={hideLegend ? 'sr-only' : 'mb-2 text-caps uppercase text-text-muted'}>{m.theme_label()}</legend>
		<div class="flex gap-1 rounded-[8px] bg-surface-container p-1">
			{#each options as option (option.mode)}
				<button
					type="button"
					onclick={() => theme.set(option.mode)}
					aria-pressed={theme.mode === option.mode}
					class="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[6px]
						text-body-sm font-semibold transition-colors
						{theme.mode === option.mode
						? 'bg-surface text-primary-soft-text shadow-level-1'
						: 'text-text-muted hover:text-text'}"
				>
					<Icon name={option.icon} size={18} />
					{option.label()}
				</button>
			{/each}
		</div>
	</fieldset>
{/if}
