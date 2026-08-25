<script lang="ts">
	import Icon from '$components/primitives/Icon.svelte';
	import * as m from '$lib/paraglide/messages';
	import { toasts } from '$stores/toast.svelte';

	/**
	 * Booking reference with a copy action.
	 *
	 * A PNR identifies a booking, not a person: it carries no name, age, or
	 * gender, and is the only identifier the specification puts in a URL.
	 */

	interface Props {
		pnr: string;
		label?: string;
		class?: string;
	}

	let { pnr, label, class: className = '' }: Props = $props();

	async function copy() {
		try {
			await navigator.clipboard.writeText(pnr);
			toasts.show(m.confirmation_pnr_copied(), 'success');
		} catch {
			// Clipboard access can be refused; the reference is visible anyway.
		}
	}
</script>

<div
	class={`flex flex-col items-center gap-1 rounded-[8px] bg-surface-container px-4 py-3
		${className}`}
>
	<span class="text-caps uppercase text-text-muted">{label ?? m.confirmation_pnr_label()}</span>
	<div class="flex items-center gap-1">
		<span class="text-mono-data text-[20px] font-bold tracking-widest text-primary-soft-text">
			{pnr}
		</span>
		<button
			type="button"
			onclick={copy}
			aria-label={m.confirmation_copy_pnr()}
			class="flex h-11 w-11 items-center justify-center rounded-[8px] text-text-muted
				transition-colors hover:bg-surface-container-high hover:text-text"
		>
			<Icon name="ticket" size={18} />
		</button>
	</div>
</div>
