<script>
import StubPage from '$components/shell/StubPage.svelte';
import * as m from '$lib/paraglide/messages';
</script>

<StubPage title={m.profile_my_profile()} body={m.profile_guest_hint()} icon="person" />
