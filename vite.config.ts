import { sveltekit } from '@sveltejs/kit/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	// MapLibre ships an ES-module worker; keeping the worker output in ESM lets
	// it load through the same `type: 'module'` path in dev and in the build.
	worker: { format: 'es' },
	plugins: [
		tailwindcss(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			strategy: ['localStorage', 'preferredLanguage', 'baseLocale'],
			/*
				Pinned, not defaulted.

				Two things compile this project into the same directory: this
				plugin (on dev and build) and the `paraglide` npm script, which
				`check` and `prepare` run. Their defaults disagree — the plugin
				emits `locale-modules` in dev and `message-modules` in
				production, while the CLI always emits `message-modules`. So
				running `check` beside a dev server rewrote the directory into
				the other layout and the browser 404'd on module paths that no
				longer existed (`messages/step_seats.js`).

				Pinning both to the same structure is the only arrangement where
				dev, build, and check cannot disagree. `locale-modules` is the
				right one to pin: with ~850 messages the alternative serves that
				many separate modules in dev, and measured against this project
				the production saving from per-message tree-shaking is about
				5 KB — nearly every message is used somewhere, so there is very
				little to shake out.

				The CLI is given `--output-structure locale-modules` to match.
				Change one and you must change the other.
			*/
			outputStructure: 'locale-modules'
		}),
		sveltekit()
	]
});
