<script>
import Icon from '$components/primitives/Icon.svelte';
import Scanner from '$components/backdrop/Scanner.svelte';
import * as m from '$lib/paraglide/messages';
import { preferences } from '$stores/preferences.svelte';
import { theme } from '$stores/theme.svelte';
const roles = [
    {
        href: '/login/traveller',
        icon: 'person',
        title: () => m.role_traveller(),
        capabilities: [
            { icon: 'seat', label: () => m.role_traveller_perk_seats() },
            { icon: 'ticket', label: () => m.role_traveller_perk_ticket() },
            { icon: 'route', label: () => m.role_traveller_perk_tracking() }
        ]
    },
    {
        href: '/login/conductor',
        icon: 'clipboard',
        title: () => m.role_conductor(),
        capabilities: [
            { icon: 'bus', label: () => m.role_conductor_perk_trip() },
            { icon: 'scan', label: () => m.role_conductor_perk_verify() },
            { icon: 'user-check', label: () => m.role_conductor_perk_boarding() }
        ]
    },
    {
        href: '/login/driver',
        icon: 'steering',
        title: () => m.role_driver(),
        capabilities: [
            { icon: 'bus', label: () => m.role_driver_perk_trip() },
            { icon: 'list', label: () => m.role_driver_perk_stops() },
            { icon: 'route', label: () => m.role_driver_perk_status() }
        ]
    },
    {
        href: '/login/operations',
        icon: 'hub',
        title: () => m.role_operations(),
        capabilities: [
            { icon: 'route', label: () => m.role_operations_perk_trips() },
            { icon: 'sliders', label: () => m.role_operations_perk_assign() },
            { icon: 'gauge', label: () => m.role_operations_perk_board() }
        ]
    }
];
/**
 * Scanner stops — the two brand colours, and nothing else.
 *
 * `#4A7C59` is VAZHI primary and `#86A789` is the accent. Those are the only
 * two colours the palette fixes, so the backdrop is built from them alone.
 *
 * The peak used to be `#2F5340` on a light page, chosen because a dark stop
 * is easy to see on white. It was too dark: at 25% lightness and 28%
 * saturation, against a 97% background, it read as black rather than as
 * green — the effect looked like smudges instead of brand colour. The
 * brightest stop is now the primary itself, so the strongest part of the
 * backdrop is exactly the green the product is built in.
 *
 * The shader's alpha is its own intensity, so the brightest stop carries
 * almost all of the visible weight: whatever `peak` is, is what the backdrop
 * looks like.
 */
const palette = $derived(theme.resolved === 'dark'
    ? { base: '#4a7c59', band: '#86a789', peak: '#86a789' }
    : { base: '#86a789', band: '#4a7c59', peak: '#4a7c59' });
/** Motion is a setting here, not only a media query. */
const stillBackground = $derived(preferences.reducedMotion);
/** Set when WebGL2 is unavailable, so the static wash takes over. */
let scannerFailed = $state(false);
const showWash = $derived(stillBackground || scannerFailed);
</script>

<svelte:head>
	<title>{m.auth_sign_in()} — {m.app_name()}</title>
</svelte:head>

<div class="chooser">
	<!--
		The backdrop, behind everything on the page.

		It used to live inside the gates panel, which clipped it to the panel's
		own rounded box — so the effect read as a texture printed on the card
		rather than as something the cards were standing on. Out here it runs the
		full width of the section, under the headline and past the edges of the
		panel, and the panel is only faintly translucent so it carries through
		rather than being covered up.
	-->
	<div class="chooser-bg" aria-hidden="true">
		{#if showWash}
			<span class="wash wash-a"></span>
			<span class="wash wash-b"></span>
		{:else}
			<!--
				Two settings are deliberately off.

				`colorSpread` runs the red, green, and blue channels through the
				palette at slightly different points — that separation is what
				gives the effect its colour fringing. This palette is a single
				hue, so all the spread did was pull the green toward neutral grey.

				`grain` adds animated noise. On a near-white page that desaturates
				the colour and reads as dirt rather than as texture.
			-->
			<Scanner
				color1={palette.base}
				color2={palette.band}
				color3={palette.peak}
				scanDirection="diagonal"
				speed={0.34}
				sweepSpeed={0.2}
				sweepWidth={1.9}
				sweepFalloff={5}
				scale={2.4}
				frequency={1.7}
				ripple={0.26}
				bandDensity={9}
				lineSharpness={5}
				glow={0.18}
				colorSpread={0}
				brightness={1}
				contrast={1.15}
				softness={1.5}
				vignette={0.6}
				scanline={false}
				grain={false}
				grainIntensity={0}
				opacity={theme.resolved === 'dark' ? 0.55 : 0.45}
				mouseInteraction={true}
				mouseRadius={0.45}
				mouseStrength={0.45}
				onfallback={() => (scannerFailed = true)}
			/>
		{/if}
	</div>

	<div
		class="shell-width relative flex w-full flex-col items-center gap-9 px-4 py-12 md:gap-11
			md:px-6 md:py-16"
	>
		<header class="flex max-w-2xl flex-col items-center gap-4 text-center">
			<span class="eyebrow">
				<Icon name="shield" size={14} />
				{m.role_chooser_eyebrow()}
			</span>
			<h2 class="text-balance text-headline text-text md:text-display">
				{m.role_chooser_title()}
			</h2>
			<p class="text-balance text-body text-text-muted md:text-title md:font-normal">
				{m.role_chooser_subtitle()}
			</p>
		</header>

		<div class="gates">
			<ul class="gates-grid">
				{#each roles as role (role.href)}
					<li class="gate-cell">
						<a href={role.href} class="gate">
							<span class="gate-icon">
								<Icon name={role.icon} size={26} />
							</span>

							<span class="gate-name">{role.title()}</span>

							<span class="gate-caps">
								{#each role.capabilities as capability (capability.label())}
									<span class="gate-cap">
										<span class="gate-cap-dot"><Icon name={capability.icon} size={14} /></span>
										{capability.label()}
									</span>
								{/each}
							</span>

							<span class="gate-go">
								{m.role_continue()}
								<span class="gate-arrow"><Icon name="arrow-right" size={16} /></span>
							</span>
						</a>
					</li>
				{/each}
			</ul>
		</div>

		<p class="note">
			<span class="shrink-0 text-primary-soft-text"><Icon name="shield" size={16} /></span>
			{m.auth_session_note()}
		</p>
	</div>
</div>

<style>
	/* ---------------------------------------------------------------------
	   Every colour is mixed from the existing theme tokens, so light and dark
	   both follow without a second palette.
	--------------------------------------------------------------------- */

	.chooser {
		position: relative;
		width: 100%;
		/* Clips the backdrop to the section without creating a scroll
		   container, so it cannot push a horizontal scrollbar onto the page. */
		overflow-x: clip;
	}

	/*
		The page backdrop.

		Absolutely positioned behind the content rather than nested inside the
		panel, so the effect runs the whole width of the section and the cards
		read as sitting on top of it.
	*/
	.chooser-bg {
		position: absolute;
		inset: 0;
		z-index: 0;
		pointer-events: none;
		overflow: hidden;
	}

	/* Fades the backdrop out at the top and bottom edges so it blends into the
	   page instead of stopping on a hard line. */
	.chooser-bg::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to bottom,
			var(--c-background) 0%,
			transparent 18%,
			transparent 82%,
			var(--c-background) 100%
		);
	}

	.eyebrow {
		position: relative;
		z-index: 1;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 6px 14px;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--c-primary) 25%, transparent);
		background: var(--c-primary-soft);
		color: var(--c-primary-soft-text);
		font-size: var(--text-caps);
		line-height: var(--text-caps--line-height);
		letter-spacing: var(--text-caps--letter-spacing);
		font-weight: 700;
		text-transform: uppercase;
	}

	/* --- The panel ------------------------------------------------------- */

	.gates {
		position: relative;
		z-index: 1;
		width: 100%;
		overflow: hidden;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-sheet);
		/*
			Very slightly translucent, so the backdrop reads through the panel
			rather than stopping dead at its edge. Kept at 94% because the gate
			labels sit on this surface and their contrast has to hold; the
			backdrop contributes a tint, not a texture behind the text.
		*/
		background: color-mix(in srgb, var(--c-surface) 94%, transparent);
		box-shadow: var(--shadow-level-2);
	}

	/* --- Backdrop layers -------------------------------------------------- */

	/*
		The fallback background: two soft brand washes drifting past each other
		on different periods. Shown when WebGL2 is unavailable or the viewer has
		asked for reduced motion — in the latter case the global rule in app.css
		stops the drift, leaving a still brand wash rather than a blank page.
	*/
	.wash {
		position: absolute;
		display: block;
		border-radius: 50%;
		filter: blur(70px);
		will-change: transform;
	}

	.wash-a {
		top: -35%;
		left: -10%;
		width: 55%;
		height: 150%;
		background: color-mix(in srgb, var(--c-primary) 22%, transparent);
		animation: drift-a 26s ease-in-out infinite;
	}

	.wash-b {
		top: -30%;
		right: -12%;
		width: 50%;
		height: 145%;
		background: color-mix(in srgb, var(--c-accent) 30%, transparent);
		animation: drift-b 32s ease-in-out infinite;
	}

	@keyframes drift-a {
		0%,
		100% {
			transform: translate3d(0, 0, 0) scale(1);
		}
		50% {
			transform: translate3d(38%, 6%, 0) scale(1.15);
		}
	}

	@keyframes drift-b {
		0%,
		100% {
			transform: translate3d(0, 0, 0) scale(1.1);
		}
		50% {
			transform: translate3d(-32%, -8%, 0) scale(1);
		}
	}

	/* --- The four gates -------------------------------------------------- */

	.gates-grid {
		position: relative;
		display: grid;
		grid-template-columns: 1fr;
	}

	@media (min-width: 640px) {
		.gates-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (min-width: 1024px) {
		.gates-grid {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}

	/*
		Hairline dividers rather than gaps, so the four read as one panel. The
		rules are per-breakpoint because the wrap position moves.
	*/
	.gate-cell + .gate-cell {
		border-top: 1px solid var(--c-border);
	}

	@media (min-width: 640px) {
		.gate-cell + .gate-cell {
			border-top: 0;
		}

		.gate-cell:nth-child(n + 3) {
			border-top: 1px solid var(--c-border);
		}

		.gate-cell:nth-child(even) {
			border-left: 1px solid var(--c-border);
		}
	}

	@media (min-width: 1024px) {
		.gate-cell:nth-child(n + 3) {
			border-top: 0;
		}

		.gate-cell:nth-child(even) {
			border-left: 0;
		}

		.gate-cell + .gate-cell {
			border-left: 1px solid var(--c-border);
		}
	}

	.gate {
		position: relative;
		display: flex;
		height: 100%;
		flex-direction: column;
		align-items: flex-start;
		gap: 14px;
		padding: 28px 24px 24px;
		isolation: isolate;
		transition: background-color 220ms ease;
	}

	@media (min-width: 1024px) {
		.gate {
			padding: 34px 26px 28px;
		}
	}

	/*
		A tint that rises from the bottom of the gate on hover, the way a
		selected column lights up. Drawn as a pseudo-element so the panel's own
		background stays untouched.
	*/
	.gate::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		background: linear-gradient(
			to top,
			color-mix(in srgb, var(--c-primary) 12%, transparent),
			transparent 70%
		);
		opacity: 0;
		transition: opacity 260ms ease;
	}

	.gate:hover::before,
	.gate:focus-visible::before {
		opacity: 1;
	}

	/* The live gate is marked along its top edge, which reads clearly whether
	   the gate is in a row of four, a row of two, or stacked. */
	.gate::after {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: var(--c-primary);
		transform: scaleX(0);
		transform-origin: 0 50%;
		transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.gate:hover::after,
	.gate:focus-visible::after {
		transform: scaleX(1);
	}

	.gate-icon {
		display: flex;
		height: 56px;
		width: 56px;
		align-items: center;
		justify-content: center;
		border-radius: 18px;
		background: linear-gradient(
			135deg,
			var(--c-primary-soft),
			color-mix(in srgb, var(--c-accent-soft) 75%, var(--c-surface))
		);
		color: var(--c-primary-soft-text);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c-primary) 20%, transparent);
		transition:
			box-shadow 240ms ease,
			transform 240ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.gate:hover .gate-icon,
	.gate:focus-visible .gate-icon {
		transform: translateY(-3px);
		box-shadow:
			inset 0 0 0 1px color-mix(in srgb, var(--c-primary) 45%, transparent),
			0 8px 18px color-mix(in srgb, var(--c-primary) 22%, transparent);
	}

	.gate-name {
		font-size: var(--text-title);
		line-height: var(--text-title--line-height);
		font-weight: 600;
		color: var(--c-text);
	}

	/* The capability list stands in for a description: it says what the role
	   can actually do, in fewer words than a sentence would take. */
	.gate-caps {
		display: flex;
		width: 100%;
		flex-direction: column;
		gap: 10px;
		padding-top: 14px;
		border-top: 1px solid var(--c-border);
	}

	.gate-cap {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: var(--text-body-sm);
		line-height: var(--text-body-sm--line-height);
		color: var(--c-text-muted);
	}

	.gate-cap-dot {
		display: flex;
		height: 26px;
		width: 26px;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		background: var(--c-surface-container);
		color: var(--c-primary-soft-text);
	}

	.gate-go {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: auto;
		padding-top: 8px;
		min-height: 44px;
		font-size: var(--text-body-sm);
		font-weight: 600;
		color: var(--c-primary-soft-text);
	}

	.gate-arrow {
		display: inline-flex;
		height: 30px;
		width: 30px;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		border: 1.5px solid color-mix(in srgb, var(--c-primary) 40%, transparent);
		transition:
			transform 240ms cubic-bezier(0.22, 1, 0.36, 1),
			background-color 200ms ease,
			border-color 200ms ease,
			color 200ms ease;
	}

	.gate:hover .gate-arrow,
	.gate:focus-visible .gate-arrow {
		background: var(--c-primary);
		border-color: var(--c-primary);
		color: var(--c-on-primary);
		transform: translateX(4px);
	}

	/* --- Footnote -------------------------------------------------------- */

	.note {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 16px;
		border-radius: 999px;
		border: 1px solid var(--c-border);
		background: var(--c-surface);
		font-size: var(--text-body-sm);
		line-height: var(--text-body-sm--line-height);
		color: var(--c-text-muted);
	}

	/* ---------------------------------------------------------------------
	   Reduced motion.

	   The rule in app.css shortens durations, which stops the loops but leaves
	   hover transforms free to jump. These remove the movement itself, so the
	   page settles rather than snapping. The washes keep their colour; only
	   their drift stops.
	--------------------------------------------------------------------- */

	@media (prefers-reduced-motion: reduce) {
		.gate:hover .gate-icon,
		.gate:focus-visible .gate-icon,
		.gate:hover .gate-arrow,
		.gate:focus-visible .gate-arrow {
			transform: none;
		}

		.gate::after {
			transition: none;
		}
	}

	:global(html[data-motion='reduced']) .gate:hover .gate-icon,
	:global(html[data-motion='reduced']) .gate:focus-visible .gate-icon,
	:global(html[data-motion='reduced']) .gate:hover .gate-arrow,
	:global(html[data-motion='reduced']) .gate:focus-visible .gate-arrow {
		transform: none;
	}

	:global(html[data-motion='reduced']) .gate::after {
		transition: none;
	}
</style>
