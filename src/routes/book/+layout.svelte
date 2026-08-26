<script>
import { beforeNavigate } from '$app/navigation';
import { bookingDraft } from '$stores/booking.svelte';
import { passengers } from '$stores/passengers.svelte';
let { children } = $props();
beforeNavigate(({ to }) => {
    const leavingFlow = !to?.url.pathname.startsWith('/book/');
    if (leavingFlow) {
        passengers.clear();
        bookingDraft.reset();
    }
});
</script>

<div class="flex flex-1 flex-col">
	{@render children()}
</div>
