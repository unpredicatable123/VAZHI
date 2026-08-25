import type { ClockTime, IsoDate, Paise } from '$types/common';
import type { Locale } from '$types/preferences';

const localeTag: Record<Locale, string> = {
	en: 'en-IN',
	ta: 'ta-IN'
};

/** Formats paise as Indian rupees with grouped digits, e.g. 164000 -> ₹1,640. */
export function formatFare(amount: Paise, locale: Locale = 'en'): string {
	const rupees = amount / 100;
	return new Intl.NumberFormat(localeTag[locale], {
		style: 'currency',
		currency: 'INR',
		minimumFractionDigits: 0,
		maximumFractionDigits: rupees % 1 === 0 ? 0 : 2
	}).format(rupees);
}

/** 315 -> "5h 15m". Kept locale-neutral because the unit letters are part of
 *  the transit metadata style rather than prose. */
export function formatDuration(totalMinutes: number): string {
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

export function formatDistance(km: number): string {
	return `${km} km`;
}

/** Renders an ISO date for display, falling back to the raw value if it is not
 *  parseable so a bad input never throws inside a template. */
export function formatJourneyDate(date: IsoDate, locale: Locale = 'en'): string {
	const parsed = new Date(`${date}T00:00:00`);
	if (Number.isNaN(parsed.getTime())) return date;
	return new Intl.DateTimeFormat(localeTag[locale], {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		year: 'numeric'
	}).format(parsed);
}

/** Today in local time as `YYYY-MM-DD`. */
export function todayIso(): IsoDate {
	const now = new Date();
	const offset = now.getTimezoneOffset() * 60_000;
	return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/** Clock times are already in 24-hour display form; this guards the shape. */
export function formatClock(time: ClockTime): string {
	return /^\d{2}:\d{2}$/.test(time) ? time : '--:--';
}

/**
 * A place name in the reader's language.
 *
 * Proper nouns live on the record rather than in message files, so this is
 * the single place that decides which spelling to show. Falls back to the
 * English form if a Tamil one is ever missing.
 */
export function placeName(place: { name: string; nameTa: string }, locale: Locale = 'en'): string {
	return locale === 'ta' && place.nameTa ? place.nameTa : place.name;
}
