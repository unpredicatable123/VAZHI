<script lang="ts">
	import Badge from '$components/primitives/Badge.svelte';
	import type { TripStatus } from '$types/fleet';
	import { tripStatusLabel, tripStatusTone } from '$utils/trip-status';

	/**
	 * A trip status, shown the same way everywhere.
	 *
	 * Wraps the existing `Badge` primitive rather than inventing a chip, so a
	 * status reads identically on the driver dashboard, the conductor card, and
	 * the Operations tables.
	 */

	interface Props {
		status: TripStatus;
		class?: string;
	}

	let { status, class: className = '' }: Props = $props();
</script>

<Badge tone={tripStatusTone(status)} shape="pill" class={className}>
	{tripStatusLabel(status)}
</Badge>
