import { browser } from '$app/environment';
import { loadThemeMode, saveThemeMode } from '$services/preferences.service';
/**
 * Theme store. `mode` is the user's choice (Light / Dark / System) and
 * `resolved` is what the document actually paints.
 */
class ThemeStore {
    mode = $state('system');
    systemPrefersDark = $state(false);
    get resolved() {
        if (this.mode === 'system')
            return this.systemPrefersDark ? 'dark' : 'light';
        return this.mode;
    }
    /** Called once from the root layout after hydration. */
    init() {
        if (!browser)
            return () => { };
        const query = window.matchMedia('(prefers-color-scheme: dark)');
        this.systemPrefersDark = query.matches;
        this.mode = loadThemeMode();
        this.apply();
        const onChange = (event) => {
            this.systemPrefersDark = event.matches;
            this.apply();
        };
        query.addEventListener('change', onChange);
        return () => query.removeEventListener('change', onChange);
    }
    set(mode) {
        this.mode = mode;
        saveThemeMode(mode);
        this.apply();
    }
    apply() {
        if (!browser)
            return;
        document.documentElement.dataset.theme = this.resolved;
    }
}
export const theme = new ThemeStore();
