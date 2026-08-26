<script>
import Icon from '$components/primitives/Icon.svelte';
import * as m from '$lib/paraglide/messages';
/**
 * Privacy policy.
 *
 * Written as the honest description of what this build actually does rather
 * than as boilerplate: every claim below is one the code enforces, and the
 * demonstration note keeps it from reading as a promise about a service
 * that does not exist yet.
 */
const holds = [
    { icon: 'clock', body: () => m.privacy_hold_memory() },
    { icon: 'monitor', body: () => m.privacy_hold_device() },
    { icon: 'route', body: () => m.privacy_hold_route() }
];
const nevers = [
    () => m.privacy_never_url(),
    () => m.privacy_never_storage(),
    () => m.privacy_never_log(),
    () => m.privacy_never_id(),
    () => m.privacy_never_share()
];
</script>

<svelte:head>
	<title>{m.privacy_title()} — {m.app_name()}</title>
</svelte:head>

<div class="shell-width flex w-full max-w-3xl flex-col gap-8 px-4 py-8 md:px-6 md:py-12">
	<header class="flex flex-col gap-3">
		<span
			class="flex w-max items-center gap-2 rounded-full border border-primary/25 bg-primary-soft
				px-3 py-1.5 text-caps uppercase text-primary-soft-text"
		>
			<Icon name="shield" size={14} />
			{m.profile_privacy_safety()}
		</span>
		<h1 class="text-headline-sm text-text md:text-headline">{m.privacy_title()}</h1>
		<p class="text-body text-text-muted">{m.privacy_intro()}</p>
		<p
			class="flex items-start gap-2 rounded-card border border-border bg-surface-container p-3
				text-body-sm text-text-muted"
		>
			<span class="mt-0.5 shrink-0 text-primary-soft-text"><Icon name="info" size={16} /></span>
			{m.privacy_demo_note()}
		</p>
	</header>

	<section class="flex flex-col gap-3" aria-labelledby="privacy-holds">
		<h2 id="privacy-holds" class="text-title text-text">{m.privacy_hold_title()}</h2>
		<ul class="flex flex-col gap-2">
			{#each holds as item (item.icon)}
				<li
					class="flex items-start gap-3 rounded-card border border-border bg-surface p-4
						shadow-level-1"
				>
					<span class="mt-0.5 shrink-0 text-primary-soft-text">
						<Icon name={item.icon} size={20} />
					</span>
					<span class="text-body-sm text-text">{item.body()}</span>
				</li>
			{/each}
		</ul>
	</section>

	<section class="flex flex-col gap-3" aria-labelledby="privacy-nevers">
		<h2 id="privacy-nevers" class="text-title text-text">{m.privacy_never_title()}</h2>
		<ul class="flex flex-col gap-2">
			{#each nevers as body, index (index)}
				<li class="flex items-start gap-3">
					<span class="mt-0.5 shrink-0 text-primary-soft-text">
						<Icon name="check" size={18} strokeWidth={2.6} />
					</span>
					<span class="text-body-sm text-text">{body()}</span>
				</li>
			{/each}
		</ul>
	</section>

	<section class="flex flex-col gap-2" aria-labelledby="privacy-crew">
		<h2 id="privacy-crew" class="text-title text-text">{m.privacy_crew_title()}</h2>
		<p class="text-body-sm text-text-muted">{m.privacy_crew_body()}</p>
	</section>

	<section class="flex flex-col gap-2" aria-labelledby="privacy-comfort">
		<h2 id="privacy-comfort" class="text-title text-text">{m.privacy_comfort_title()}</h2>
		<p class="text-body-sm text-text-muted">{m.privacy_comfort_body()}</p>
	</section>

	<section class="flex flex-col gap-2" aria-labelledby="privacy-control">
		<h2 id="privacy-control" class="text-title text-text">{m.privacy_control_title()}</h2>
		<p class="text-body-sm text-text-muted">{m.privacy_control_body()}</p>
		<a
			href="/accessibility"
			class="mt-1 inline-flex min-h-[44px] w-max items-center gap-1.5 text-body-sm font-semibold
				text-primary-soft-text underline-offset-4 hover:underline"
		>
			{m.a11y_page_title()}
			<Icon name="chevron-right" size={16} />
		</a>
	</section>
</div>
