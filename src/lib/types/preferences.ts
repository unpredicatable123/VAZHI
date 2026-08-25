/**
 * Device-level preferences.
 *
 * Everything in this file is non-identifying and safe to persist. Passenger
 * details are never represented here and never reach storage.
 */

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';
export type Locale = 'en' | 'ta';

export interface AccessibilityPreferences {
	/** Prioritises accessible buses, boarding points and designated seats. */
	accessibleTravelMode: boolean;
	largerText: boolean;
	reducedMotion: boolean;
}

export const defaultAccessibilityPreferences: AccessibilityPreferences = {
	accessibleTravelMode: false,
	largerText: false,
	reducedMotion: false
};
