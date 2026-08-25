import { browser } from '$app/environment';
import { loadThemeMode, saveThemeMode } from '$services/preferences.service';
import type { ResolvedTheme, ThemeMode } from '$types/preferences';

/**
 * Theme store. `mode` is the user's choice (Light / Dark / System) and
 * `resolved` is what the document actually paints.
 */
class ThemeStore {
	mode = $state<ThemeMode>('system');
	systemPrefersDark = $state(false);

	get resolved(): ResolvedTheme {
		if (this.mode === 'system') return this.systemPrefersDark ? 'dark' : 'light';
		return this.mode;
	}

	/** Called once from the root layout after hydration. */
	init(): () => void {
		if (!browser) return () => {};

		const query = window.matchMedia('(prefers-color-scheme: dark)');
		this.systemPrefersDark = query.matches;
		this.mode = loadThemeMode();
		this.apply();

		const onChange = (event: MediaQueryListEvent) => {
			this.systemPrefersDark = event.matches;
			this.apply();
		};
		query.addEventListener('change', onChange);
		return () => query.removeEventListener('change', onChange);
	}

	set(mode: ThemeMode): void {
		this.mode = mode;
		saveThemeMode(mode);
		this.apply();
	}

	private apply(): void {
		if (!browser) return;
		document.documentElement.dataset.theme = this.resolved;
	}
}

export const theme = new ThemeStore();
