/**
 * Device-level preferences.
 *
 * Everything in this file is non-identifying and safe to persist. Passenger
 * details are never represented here and never reach storage.
 */
export const defaultAccessibilityPreferences = {
    accessibleTravelMode: false,
    largerText: false,
    reducedMotion: false
};
