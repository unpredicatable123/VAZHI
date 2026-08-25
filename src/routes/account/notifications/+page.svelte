<script lang="ts">
	import StubPage from '$components/shell/StubPage.svelte';
	import * as m from '$lib/paraglide/messages';
</script>

<StubPage title={m.profile_notifications()} body={m.stub_phase_note()} icon="bell" />
