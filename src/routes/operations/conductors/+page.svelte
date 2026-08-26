<script>
import CrewRoster from '$components/operations/CrewRoster.svelte';
import * as m from '$lib/paraglide/messages';
/**
 * Conductor management.
 *
 * The roster itself is `CrewRoster`, shared with driver management:
 * both roles are rostered, given a duty status, and assigned to a trip in
 * exactly the same way, so there is one screen and one privacy boundary
 * rather than two that can drift.
 */
</script>

<svelte:head>
	<title>{m.ops_conductors_title()} — {m.app_name()}</title>
</svelte:head>

<div class="shell-width flex w-full flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
	<header>
		<h2 class="text-headline-sm text-text md:text-headline">{m.ops_conductors_title()}</h2>
		<p class="mt-1 text-body-sm text-text-muted">{m.ops_conductors_subtitle()}</p>
	</header>

	<CrewRoster role="conductor" />
</div>
