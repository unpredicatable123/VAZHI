<script>
import Icon from '$components/primitives/Icon.svelte';
import * as m from '$lib/paraglide/messages';
/**
 * Accessibility statement.
 *
 * Names what the build actually does and, just as importantly, what it does
 * not do yet — an accessibility page that only lists successes is not much
 * use to the person deciding whether they can rely on it.
 */
const built = [
    { icon: 'sliders', body: () => m.a11y_built_keyboard() },
    { icon: 'target', body: () => m.a11y_built_focus() },
    { icon: 'seat', body: () => m.a11y_built_targets() },
    { icon: 'sun', body: () => m.a11y_built_contrast() },
    { icon: 'edit', body: () => m.a11y_built_labels() },
    { icon: 'bolt', body: () => m.a11y_built_motion() },
    { icon: 'plus', body: () => m.a11y_built_text() },
    { icon: 'language', body: () => m.a11y_built_language() }
];
</script>

<svelte:head>
	<title>{m.a11y_page_title()} — {m.app_name()}</title>
</svelte:head>

<div class="shell-width flex w-full max-w-3xl flex-col gap-8 px-4 py-8 md:px-6 md:py-12">
	<header class="flex flex-col gap-3">
		<span
			class="flex w-max items-center gap-2 rounded-full border border-primary/25 bg-primary-soft
				px-3 py-1.5 text-caps uppercase text-primary-soft-text"
		>
			<Icon name="accessible" size={14} />
			{m.atm_title()}
		</span>
		<h1 class="text-headline-sm text-text md:text-headline">{m.a11y_page_title()}</h1>
		<p class="text-body text-text-muted">{m.a11y_intro()}</p>
	</header>

	<section
		class="flex flex-col gap-2 rounded-card border border-border bg-surface p-4 shadow-level-1
			md:p-6"
		aria-labelledby="a11y-atm"
	>
		<h2 id="a11y-atm" class="flex items-center gap-2 text-title text-text">
			<span class="text-primary-soft-text"><Icon name="accessible" size={20} /></span>
			{m.a11y_atm_title()}
		</h2>
		<p class="text-body-sm text-text-muted">{m.a11y_atm_body()}</p>
		<a
			href="/account/preferences"
			class="mt-1 inline-flex min-h-[44px] w-max items-center gap-1.5 text-body-sm font-semibold
				text-primary-soft-text underline-offset-4 hover:underline"
		>
			{m.a11y_atm_link()}
			<Icon name="chevron-right" size={16} />
		</a>
	</section>

	<section class="flex flex-col gap-3" aria-labelledby="a11y-built">
		<h2 id="a11y-built" class="text-title text-text">{m.a11y_built_title()}</h2>
		<ul class="grid grid-cols-1 gap-2 sm:grid-cols-2">
			{#each built as item (item.icon)}
				<li
					class="flex items-start gap-3 rounded-card border border-border bg-surface p-4
						shadow-level-1"
				>
					<span class="mt-0.5 shrink-0 text-primary-soft-text">
						<Icon name={item.icon} size={18} />
					</span>
					<span class="text-body-sm text-text">{item.body()}</span>
				</li>
			{/each}
		</ul>
	</section>

	<section class="flex flex-col gap-2" aria-labelledby="a11y-limits">
		<h2 id="a11y-limits" class="text-title text-text">{m.a11y_limits_title()}</h2>
		<p class="text-body-sm text-text-muted">{m.a11y_limits_body()}</p>
	</section>

	<section class="flex flex-col gap-2" aria-labelledby="a11y-feedback">
		<h2 id="a11y-feedback" class="text-title text-text">{m.a11y_feedback_title()}</h2>
		<p class="text-body-sm text-text-muted">{m.a11y_feedback_body()}</p>
		<a
			href="/privacy"
			class="mt-1 inline-flex min-h-[44px] w-max items-center gap-1.5 text-body-sm font-semibold
				text-primary-soft-text underline-offset-4 hover:underline"
		>
			{m.privacy_title()}
			<Icon name="chevron-right" size={16} />
		</a>
	</section>
</div>
