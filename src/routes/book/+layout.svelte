<script lang="ts">
	import type { Snippet } from 'svelte';
	import { beforeNavigate } from '$app/navigation';
	import { bookingDraft } from '$stores/booking.svelte';
	import { passengers } from '$stores/passengers.svelte';

	/**
	 * Booking flow layout.
	 *
	 * Also the privacy backstop: leaving the booking flow for any reason clears
	 * the in-memory passenger store, so personal data never outlives the flow
	 * that collected it.
	 */

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

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
