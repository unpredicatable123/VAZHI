<script lang="ts">
	import { onMount, untrack, type Snippet } from 'svelte';
	import { navigating, page } from '$app/state';
	import ToastHost from '$components/primitives/ToastHost.svelte';
	import Footer from '$components/shell/Footer.svelte';
	import Header from '$components/shell/Header.svelte';
	import MobileHeader from '$components/shell/MobileHeader.svelte';
	import MobileNav from '$components/shell/MobileNav.svelte';
	import Payani from '$components/payani/Payani.svelte';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import { afterNavigate, goto } from '$app/navigation';
	import { preferences } from '$stores/preferences.svelte';
	import { session } from '$stores/session.svelte';
	import { theme } from '$stores/theme.svelte';
	import { toasts } from '$stores/toast.svelte';
	import { isSignInPath, isWorkspacePath, redirectFor, withRedirectTo } from '$utils/route-access';
	import '../app.css';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	// Read the stored session during initialisation rather than in an effect, so
	// the first render already knows the role and no protected markup paints
	// before the guard has had a chance to run.
	session.init();

	$effect(() => {
		const stopWatchingSystemTheme = theme.init();
		preferences.init();
		return stopWatchingSystemTheme;
	});

	/**
	 * The single route guard.
	 *
	 * Every navigation is checked against the central rules in `route-access`,
	 * so no page implements its own authentication logic and there is one place
	 * to audit.
	 *
	 * Two halves, deliberately:
	 *  - `allowed` gates rendering, so a protected page never paints for the
	 *    wrong role even for a frame;
	 *  - `enforce` performs the redirect from navigation callbacks.
	 *
	 * The redirect is issued from `afterNavigate` and `onMount` rather than
	 * from an effect that reads `page.url`, because calling `goto` inside such
	 * an effect re-enters it and trips Svelte's update-depth guard.
	 */
	const allowed = $derived(
		session.initialised && redirectFor(page.url.pathname, session.current) === null
	);

	function enforce(url: URL) {
		const outcome = redirectFor(url.pathname, session.current);
		if (!outcome) return;

		if (outcome.reason === 'sign-in-required') {
			toasts.show(m.auth_sign_in_required(), 'info');
			goto(withRedirectTo(outcome.to, url.pathname + url.search), { replaceState: true });
			return;
		}

		// Wrong role for this area: send them to their own home. Landing on a
		// sign-in screen while already signed in is ordinary, so that case
		// redirects silently.
		if (!isSignInPath(url.pathname)) {
			toasts.show(m.auth_wrong_role(), 'warning');
		}
		goto(outcome.to, { replaceState: true });
	}

	onMount(() => {
		session.init();
		if (session.initialised) enforce(page.url);
	});

	/*
		Re-checks when the SESSION changes, not when the URL does.

		Firebase resolves the signed-in user asynchronously, so the guard has to
		run again once `initialised` flips and again whenever the role changes —
		signing out on a protected page is the case that matters. But `enforce`
		calls `goto`, and an effect that also *reads* `page.url` would be woken by
		its own redirect and trade navigations with `afterNavigate` until the tab
		stops responding.

		`untrack` keeps the URL read out of the dependency set: session changes
		wake this, and URL changes are already covered by `afterNavigate` below.
	*/
	$effect(() => {
		void session.initialised;
		void session.current;
		if (!session.initialised) return;
		untrack(() => enforce(page.url));
	});

	afterNavigate(({ to }) => {
		if (to?.url) enforce(to.url);
	});

	// Keeps the document language in step with the active locale so screen
	// readers switch voice between English and Tamil.
	const locale = $derived(getLocale());

	$effect(() => {
		document.documentElement.lang = locale;
	});

	/**
	 * The booking flow is linear and transactional: it replaces the mobile
	 * bottom navigation with its own fixed call-to-action so the two never
	 * stack, and drops the footer to keep the step in focus.
	 */
	const inBookingFlow = $derived(page.url.pathname.startsWith('/book/'));

	/**
	 * Each operational workspace — conductor, driver, operations — supplies its
	 * own navigation, so the traveller bottom bar and footer stand down inside
	 * them. The rule lives in `route-access` beside the protection rules.
	 */
	const inWorkspace = $derived(isWorkspacePath(page.url.pathname));
	const hideTravellerChrome = $derived(inBookingFlow || inWorkspace);
	const routeChanging = $derived(Boolean(navigating.to));
</script>

<svelte:head>
	<title>{m.app_description()} — {m.app_name()}</title>
	<meta name="description" content={m.app_description()} />
</svelte:head>

<a
	href="#main-content"
	class="sr-only z-[80] rounded-[8px] bg-primary px-4 py-3 text-on-primary
		focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
>
	{m.skip_to_content()}
</a>

{#if routeChanging}
	<div
		class="fixed inset-x-0 top-0 z-[90] h-1 overflow-hidden bg-primary-soft"
		role="progressbar"
		aria-label={m.progress_label()}
	>
		<div class="h-full w-2/3 animate-pulse bg-primary"></div>
	</div>
{/if}

<div class="flex min-h-screen flex-col">
	<MobileHeader />
	<Header />

	<main
		id="main-content"
		class="flex flex-1 flex-col {hideTravellerChrome ? '' : 'pb-[88px] md:pb-0'}"
		tabindex="-1"
	>
		{#if allowed}
			{@render children()}
		{/if}
	</main>

	{#if !hideTravellerChrome}
		<!-- The footer is desktop-only; on mobile the bottom bar owns that space. -->
		<div class="hidden md:block">
			<Footer />
		</div>

		<MobileNav />
	{/if}
	<!-- Traveller-only; the component decides, using the same session store and
	     workspace rule as the rest of the shell. -->
	<Payani />
	<ToastHost />
</div>

<!-- Announces route changes for assistive technology. -->
<p class="sr-only" aria-live="polite">{page.url.pathname}</p>
