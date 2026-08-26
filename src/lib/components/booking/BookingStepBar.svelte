<script>
import { goto } from '$app/navigation';
import Icon from '$components/primitives/Icon.svelte';
import * as m from '$lib/paraglide/messages';
import { bookingDraft } from '$stores/booking.svelte';
import { passengers } from '$stores/passengers.svelte';
let { title, backHref, step, totalSteps = 6 } = $props();
function cancel() {
    if (!confirm(m.booking_cancel_confirm()))
        return;
    // Wipes every piece of personal data before leaving the flow.
    passengers.clear();
    bookingDraft.reset();
    goto('/explore');
}
</script>

<div class="border-b border-border bg-surface">
	<div class="shell-width flex items-center justify-between gap-3 px-4 py-2 md:px-6">
		<div class="flex min-w-0 items-center gap-2">
			<a
				href={backHref}
				aria-label={m.booking_back()}
				class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px]
					text-text-muted transition-colors hover:bg-surface-container hover:text-text"
			>
				<Icon name="chevron-left" size={20} />
			</a>
			<div class="min-w-0">
				<h1 class="truncate text-title text-text">{title}</h1>
				<p class="text-caps uppercase text-text-muted">
					{m.booking_step_of({ current: step, total: totalSteps })}
				</p>
			</div>
		</div>

		<button
			type="button"
			onclick={cancel}
			class="flex min-h-[44px] shrink-0 items-center rounded-[8px] px-3 text-body-sm
				font-semibold text-text-muted transition-colors hover:bg-surface-container
				hover:text-danger"
		>
			{m.booking_cancel_short()}
		</button>
	</div>
</div>
