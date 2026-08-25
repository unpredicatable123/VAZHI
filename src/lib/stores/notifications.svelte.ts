import { browser } from '$app/environment';
import type { BoardingReminderLead, NotificationPreferences } from '$types/booking';
import { defaultNotificationPreferences } from '$types/booking';

/**
 * Notification and boarding-reminder settings.
 *
 * Device-level switches only — no phone number, no email address, no push
 * token, and no delivery endpoint of any kind is collected. Safe to persist
 * because nothing here identifies anyone.
 */

const STORAGE_KEY = 'vazhi.notifications';

function load(): NotificationPreferences {
	if (!browser) return { ...defaultNotificationPreferences };
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { ...defaultNotificationPreferences };
		const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
		const lead = parsed.boardingReminder;
		return {
			pushEnabled: parsed.pushEnabled !== false,
			disruptionAlerts: parsed.disruptionAlerts !== false,
			boardingReminder:
				lead === 'off' || lead === '15' || lead === '30' || lead === '60'
					? lead
					: defaultNotificationPreferences.boardingReminder,
			womenNearbySignals: parsed.womenNearbySignals !== false
		};
	} catch {
		return { ...defaultNotificationPreferences };
	}
}

class NotificationStore {
	pushEnabled = $state(defaultNotificationPreferences.pushEnabled);
	disruptionAlerts = $state(defaultNotificationPreferences.disruptionAlerts);
	boardingReminder = $state<BoardingReminderLead>(
		defaultNotificationPreferences.boardingReminder
	);
	womenNearbySignals = $state(defaultNotificationPreferences.womenNearbySignals);

	initialised = $state(false);

	get snapshot(): NotificationPreferences {
		return {
			pushEnabled: this.pushEnabled,
			disruptionAlerts: this.disruptionAlerts,
			boardingReminder: this.boardingReminder,
			womenNearbySignals: this.womenNearbySignals
		};
	}

	init(): void {
		const stored = load();
		this.pushEnabled = stored.pushEnabled;
		this.disruptionAlerts = stored.disruptionAlerts;
		this.boardingReminder = stored.boardingReminder;
		this.womenNearbySignals = stored.womenNearbySignals;
		this.initialised = true;
	}

	setPushEnabled(value: boolean): void {
		this.pushEnabled = value;
		this.persist();
	}

	setDisruptionAlerts(value: boolean): void {
		this.disruptionAlerts = value;
		this.persist();
	}

	setBoardingReminder(value: BoardingReminderLead): void {
		this.boardingReminder = value;
		this.persist();
	}

	setWomenNearbySignals(value: boolean): void {
		this.womenNearbySignals = value;
		this.persist();
	}

	private persist(): void {
		if (!browser) return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.snapshot));
		} catch {
			// Storage can be unavailable in private modes; the session still works.
		}
	}
}

export const notifications = new NotificationStore();
