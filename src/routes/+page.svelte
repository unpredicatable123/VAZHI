<script>
import Icon from '$components/primitives/Icon.svelte';
import JourneySearchForm from '$components/journey/JourneySearchForm.svelte';
import TransitMap from '$components/transit/TransitMap.svelte';
import * as m from '$lib/paraglide/messages';
let { data } = $props();
</script>

<svelte:head>
	<title>{m.home_hero_title()} — {m.app_name()}</title>
</svelte:head>

<!--
	Home (spec section 10). Follows the Stitch composition: hero and search card
	in the left column, network map in the right, stacking on mobile so the
	search card stays above the fold.
-->
<div class="shell-width flex flex-col gap-6 px-4 py-6 md:flex-row md:items-start md:gap-8 md:px-6 md:py-8">
	<div class="flex w-full flex-col gap-6 md:w-1/2">
		<div class="flex flex-col gap-3">
			<h1 class="max-w-[20ch] text-headline-sm text-text md:text-display">
				{m.home_hero_title()}
			</h1>
			<p class="max-w-prose text-body text-text-muted">{m.home_hero_subtitle()}</p>
		</div>

		<JourneySearchForm stops={data.stops} districts={data.districts} />

		<!-- Privacy and accessibility trust statement (spec section 10). -->
		<section
			class="rounded-card border border-border bg-surface-container/60 p-4"
			aria-labelledby="trust-heading"
		>
			<h2 id="trust-heading" class="flex items-center gap-2 text-body font-semibold text-text">
				<span class="text-primary-soft-text"><Icon name="shield" size={20} /></span>
				{m.home_trust_title()}
			</h2>
			<p class="mt-2 text-body-sm text-text-muted">{m.home_trust_body()}</p>
			<a
				href="/privacy"
				class="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-body-sm font-semibold
					text-primary-soft-text underline-offset-4 hover:underline"
			>
				{m.home_trust_link()}
				<Icon name="chevron-right" size={16} />
			</a>
		</section>
	</div>

	<!-- Network map. Rendered by MapLibre from bundled geometry, replacing the
	     Google-hosted still image in the Stitch export. -->
	<div class="w-full md:sticky md:top-24 md:w-1/2">
		<TransitMap
			routeId="tn-network"
			label={m.map_network_label()}
			interactive={false}
			class="h-[280px] rounded-card border border-border shadow-level-1 md:h-[560px]"
		/>
		<p class="mt-2 text-body-sm text-text-faint">{m.home_map_caption()}</p>
	</div>
</div>
