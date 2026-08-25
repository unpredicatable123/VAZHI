import type {
	AccessibilityRequirement,
	ConcessionCategory,
	Gender,
	PassengerDetails,
	PassengerSummary,
	PassengerValidationIssue,
	SeatId
} from '$types/booking';
import { createEmptyPassenger } from '$types/booking';

/**
 * Passenger details — the only store in the application that holds PII.
 *
 * MEMORY ONLY. Everything below lives in JavaScript memory for the lifetime of
 * the tab and nothing more. There is no persistence call anywhere in this file
 * by design: no localStorage, no sessionStorage, no IndexedDB, no cookies, no
 * URL parameters, no fixtures, no logging, no analytics. A page reload clears
 * it, which is the intended behaviour.
 *
 * Other screens must read `summaries` (non-identifying) rather than `entries`.
 */

const MIN_AGE = 1;
const MAX_AGE = 120;
const MAX_NAME_LENGTH = 80;

class PassengerStore {
	/** One entry per selected seat, index-aligned with `seatIds`. */
	entries = $state<PassengerDetails[]>([]);
	/** The seat each entry belongs to, so the association is explicit. */
	seatIds = $state<SeatId[]>([]);

	/**
	 * Reshapes the form set to match the chosen seats, preserving what has
	 * already been typed for seats that are still selected.
	 */
	syncToSeats(seats: SeatId[]): void {
		const previousBySeat = new Map<SeatId, PassengerDetails>();
		this.seatIds.forEach((seatId, index) => {
			const entry = this.entries[index];
			if (entry) previousBySeat.set(seatId, entry);
		});

		this.seatIds = [...seats];
		this.entries = seats.map((seatId) => previousBySeat.get(seatId) ?? createEmptyPassenger());
	}

	seatFor(index: number): SeatId | undefined {
		return this.seatIds[index];
	}

	setFullName(index: number, value: string): void {
		this.#update(index, (entry) => ({ ...entry, fullName: value.slice(0, MAX_NAME_LENGTH) }));
	}

	setAge(index: number, value: number | null): void {
		this.#update(index, (entry) => ({ ...entry, age: value }));
	}

	setGender(index: number, value: Gender | ''): void {
		this.#update(index, (entry) => ({ ...entry, gender: value }));
	}

	setConcession(index: number, value: ConcessionCategory): void {
		this.#update(index, (entry) => ({ ...entry, concession: value }));
	}

	setAccessibility(index: number, value: AccessibilityRequirement): void {
		this.#update(index, (entry) => ({ ...entry, accessibility: value }));
	}

	#update(index: number, change: (entry: PassengerDetails) => PassengerDetails): void {
		const entry = this.entries[index];
		if (!entry) return;
		const next = [...this.entries];
		next[index] = change(entry);
		this.entries = next;
	}

	/**
	 * Non-identifying projection for Review and any other consumer. Carries no
	 * name, age, or gender — only the seat association and requested options.
	 */
	get summaries(): PassengerSummary[] {
		return this.entries.map((entry, index) => ({
			passengerIndex: index,
			seatId: this.seatIds[index] ?? '',
			complete: validatePassenger(entry).length === 0,
			concession: entry.concession,
			accessibility: entry.accessibility
		}));
	}

	get isComplete(): boolean {
		return this.entries.length > 0 && this.validate().length === 0;
	}

	get concessionRequested(): boolean {
		return this.entries.some((entry) => entry.concession !== 'none');
	}

	get assistanceRequested(): boolean {
		return this.entries.some((entry) => entry.accessibility !== 'none');
	}

	/** Every issue across every form, in form order then field order. */
	validate(): PassengerValidationIssue[] {
		return this.entries.flatMap((entry, passengerIndex) =>
			validatePassenger(entry).map((issue) => ({ ...issue, passengerIndex }))
		);
	}

	/** Wipes all personal data. Called on cancel and on leaving the flow. */
	clear(): void {
		this.entries = [];
		this.seatIds = [];
	}
}

type FieldIssue = Omit<PassengerValidationIssue, 'passengerIndex'>;

/**
 * Validation rules from specification section 9: a required full name, an age
 * between 1 and 120, and a required gender. Concession and accessibility are
 * optional and always have a valid default.
 */
export function validatePassenger(entry: PassengerDetails): FieldIssue[] {
	const issues: FieldIssue[] = [];

	if (entry.fullName.trim().length === 0) {
		issues.push({ field: 'fullName', messageKey: 'passenger_error_name_required' });
	} else if (entry.fullName.trim().length < 2) {
		issues.push({ field: 'fullName', messageKey: 'passenger_error_name_short' });
	}

	if (entry.age === null || Number.isNaN(entry.age)) {
		issues.push({ field: 'age', messageKey: 'passenger_error_age_required' });
	} else if (!Number.isInteger(entry.age) || entry.age < MIN_AGE || entry.age > MAX_AGE) {
		issues.push({ field: 'age', messageKey: 'passenger_error_age_range' });
	}

	if (entry.gender === '') {
		issues.push({ field: 'gender', messageKey: 'passenger_error_gender_required' });
	}

	return issues;
}

export const passengers = new PassengerStore();
