/**
 * Reads a booking reference out of a scanned QR code.
 *
 * A VAZHI ticket encodes the conductor's verification URL, so the usual case is
 * a link carrying `?pnr=`. A bare reference is accepted too, since a ticket
 * reprinted or re-encoded elsewhere may hold only that.
 *
 * Anything else returns `null` rather than being typed into the field: scanning
 * a parcel label, a payment code, or a poster should say "that is not a ticket",
 * not arrive looking like a booking that failed to verify.
 */
/** `VZ-` followed by the server's hex reference, or a seeded fixture id. */
const REFERENCE = /^VZ-[A-Z0-9]+$/;
export function referenceFromScan(raw) {
    const value = raw.trim();
    if (value === '')
        return null;
    try {
        const url = new URL(value);
        const fromQuery = url.searchParams.get('pnr')?.trim().toLocaleUpperCase();
        if (fromQuery && REFERENCE.test(fromQuery))
            return fromQuery;
        // A URL that is not one of ours, or carries no reference, is not a ticket.
        return null;
    }
    catch {
        // Not a URL. Fall through: a bare reference is still valid.
    }
    const bare = value.toLocaleUpperCase();
    return REFERENCE.test(bare) ? bare : null;
}
