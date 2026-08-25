import { browser } from '$app/environment';
import type { AccessibilityPreferences, ThemeMode } from '$types/preferences';
import { defaultAccessibilityPreferences } from '$types/preferences';

/**
 * Device preference persistence.
 *
 * Only non-identifying UI settings are written here. Passenger details are
 * memory-only by design and must never be routed through this module.
 */

const THEME_KEY = 'vazhi.theme';
const A11Y_KEY = 'vazhi.a11y';

export function loadThemeMode(): ThemeMode {
	if (!browser) return 'system';
	try {
		const raw = localStorage.getItem(THEME_KEY);
		return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system';
	} catch {
		return 'system';
	}
}

export function saveThemeMode(mode: ThemeMode): void {
	if (!browser) return;
	try {
		if (mode === 'system') localStorage.removeItem(THEME_KEY);
		else localStorage.setItem(THEME_KEY, mode);
	} catch {
		// Storage can be unavailable in private modes; the in-memory store still
		// drives this session.
	}
}

export function loadAccessibilityPreferences(): AccessibilityPreferences {
	if (!browser) return { ...defaultAccessibilityPreferences };
	try {
		const raw = localStorage.getItem(A11Y_KEY);
		if (!raw) return { ...defaultAccessibilityPreferences };
		const parsed = JSON.parse(raw) as Partial<AccessibilityPreferences>;
		return {
			accessibleTravelMode: parsed.accessibleTravelMode === true,
			largerText: parsed.largerText === true,
			reducedMotion: parsed.reducedMotion === true
		};
	} catch {
		return { ...defaultAccessibilityPreferences };
	}
}

export function saveAccessibilityPreferences(preferences: AccessibilityPreferences): void {
	if (!browser) return;
	try {
		localStorage.setItem(A11Y_KEY, JSON.stringify(preferences));
	} catch {
		// See note above.
	}
}
