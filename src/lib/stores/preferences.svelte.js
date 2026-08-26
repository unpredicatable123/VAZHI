import { browser } from '$app/environment';
import { loadAccessibilityPreferences, saveAccessibilityPreferences } from '$services/preferences.service';
import { defaultAccessibilityPreferences } from '$types/preferences';
/**
 * Accessible Travel Mode and its companion display options.
 *
 * These are travel and display preferences only. No medical information is
 * requested, stored, or inferred.
 */
class PreferencesStore {
    accessibleTravelMode = $state(defaultAccessibilityPreferences.accessibleTravelMode);
    largerText = $state(defaultAccessibilityPreferences.largerText);
    reducedMotion = $state(defaultAccessibilityPreferences.reducedMotion);
    /**
     * True once stored preferences have been read. Consumers that make a
     * one-shot decision from these values — seat seeding, for instance — must
     * wait for this so they never act on the pre-hydration defaults.
     */
    initialised = $state(false);
    get snapshot() {
        return {
            accessibleTravelMode: this.accessibleTravelMode,
            largerText: this.largerText,
            reducedMotion: this.reducedMotion
        };
    }
    init() {
        if (!browser) {
            this.initialised = true;
            return;
        }
        const stored = loadAccessibilityPreferences();
        this.accessibleTravelMode = stored.accessibleTravelMode;
        this.largerText = stored.largerText;
        this.reducedMotion = stored.reducedMotion;
        this.apply();
        this.initialised = true;
    }
    setAccessibleTravelMode(enabled) {
        this.accessibleTravelMode = enabled;
        this.persist();
    }
    setLargerText(enabled) {
        this.largerText = enabled;
        this.persist();
    }
    setReducedMotion(enabled) {
        this.reducedMotion = enabled;
        this.persist();
    }
    persist() {
        saveAccessibilityPreferences(this.snapshot);
        this.apply();
    }
    apply() {
        if (!browser)
            return;
        const root = document.documentElement;
        if (this.largerText)
            root.dataset.textSize = 'large';
        else
            delete root.dataset.textSize;
        if (this.reducedMotion)
            root.dataset.motion = 'reduced';
        else
            delete root.dataset.motion;
    }
}
export const preferences = new PreferencesStore();
