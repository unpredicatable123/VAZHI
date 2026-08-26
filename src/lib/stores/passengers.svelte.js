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
    entries = $state([]);
    /** The seat each entry belongs to, so the association is explicit. */
    seatIds = $state([]);
    /**
     * Reshapes the form set to match the chosen seats, preserving what has
     * already been typed for seats that are still selected.
     */
    syncToSeats(seats) {
        const previousBySeat = new Map();
        this.seatIds.forEach((seatId, index) => {
            const entry = this.entries[index];
            if (entry)
                previousBySeat.set(seatId, entry);
        });
        this.seatIds = [...seats];
        this.entries = seats.map((seatId) => previousBySeat.get(seatId) ?? createEmptyPassenger());
    }
    seatFor(index) {
        return this.seatIds[index];
    }
    setFullName(index, value) {
        this.#update(index, (entry) => ({ ...entry, fullName: value.slice(0, MAX_NAME_LENGTH) }));
    }
    setAge(index, value) {
        this.#update(index, (entry) => ({ ...entry, age: value }));
    }
    setGender(index, value) {
        this.#update(index, (entry) => ({ ...entry, gender: value }));
    }
    setConcession(index, value) {
        this.#update(index, (entry) => ({ ...entry, concession: value }));
    }
    setAccessibility(index, value) {
        this.#update(index, (entry) => ({ ...entry, accessibility: value }));
    }
    #update(index, change) {
        const entry = this.entries[index];
        if (!entry)
            return;
        const next = [...this.entries];
        next[index] = change(entry);
        this.entries = next;
    }
    /**
     * Non-identifying projection for Review and any other consumer. Carries no
     * name, age, or gender — only the seat association and requested options.
     */
    get summaries() {
        return this.entries.map((entry, index) => ({
            passengerIndex: index,
            seatId: this.seatIds[index] ?? '',
            complete: validatePassenger(entry).length === 0,
            concession: entry.concession,
            accessibility: entry.accessibility
        }));
    }
    get isComplete() {
        return this.entries.length > 0 && this.validate().length === 0;
    }
    get concessionRequested() {
        return this.entries.some((entry) => entry.concession !== 'none');
    }
    get assistanceRequested() {
        return this.entries.some((entry) => entry.accessibility !== 'none');
    }
    /** Every issue across every form, in form order then field order. */
    validate() {
        return this.entries.flatMap((entry, passengerIndex) => validatePassenger(entry).map((issue) => ({ ...issue, passengerIndex })));
    }
    /** Wipes all personal data. Called on cancel and on leaving the flow. */
    clear() {
        this.entries = [];
        this.seatIds = [];
    }
}
/**
 * Validation rules from specification section 9: a required full name, an age
 * between 1 and 120, and a required gender. Concession and accessibility are
 * optional and always have a valid default.
 */
export function validatePassenger(entry) {
    const issues = [];
    if (entry.fullName.trim().length === 0) {
        issues.push({ field: 'fullName', messageKey: 'passenger_error_name_required' });
    }
    else if (entry.fullName.trim().length < 2) {
        issues.push({ field: 'fullName', messageKey: 'passenger_error_name_short' });
    }
    if (entry.age === null || Number.isNaN(entry.age)) {
        issues.push({ field: 'age', messageKey: 'passenger_error_age_required' });
    }
    else if (!Number.isInteger(entry.age) || entry.age < MIN_AGE || entry.age > MAX_AGE) {
        issues.push({ field: 'age', messageKey: 'passenger_error_age_range' });
    }
    if (entry.gender === '') {
        issues.push({ field: 'gender', messageKey: 'passenger_error_gender_required' });
    }
    return issues;
}
export const passengers = new PassengerStore();
