/**
 * The single source of fare truth.
 *
 * Every screen that shows money calls this, so the canonical ₹410 per
 * passenger can never drift between seat selection, passenger details, and
 * review. Amounts are integer paise throughout — no float arithmetic.
 */
export function calculateFare(bus, passengerCount, concessionRequested = false) {
    const count = Math.max(0, Math.trunc(passengerCount));
    return {
        passengerCount: count,
        baseFarePerPassenger: bus.baseFare,
        taxesPerPassenger: bus.taxes,
        baseFare: bus.baseFare * count,
        taxes: bus.taxes * count,
        // Concessions are verified with valid ID at boarding, so nothing is
        // deducted at booking time. The line still renders when requested.
        concessionDiscount: 0,
        concessionRequested,
        total: (bus.baseFare + bus.taxes) * count
    };
}
