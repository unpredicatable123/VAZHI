<script>
import Badge from '$components/primitives/Badge.svelte';
import { tripStatusLabel, tripStatusTone } from '$utils/trip-status';
let { status, class: className = '' } = $props();
</script>

<Badge tone={tripStatusTone(status)} shape="pill" class={className}>
	{tripStatusLabel(status)}
</Badge>
