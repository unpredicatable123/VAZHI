/**
 * Seat and berth plans, generated for any service.
 *
 * WHY THIS EXISTS. Exactly one service in the app had a hand-written deck, so
 * exactly one service could be booked. Every other result in the Explorer led
 * to a seat screen that could not load, which made the whole product look like
 * a single-journey demo. A plan is now derived for whatever vehicle is working
 * the trip, so every service goes through to a ticket.
 *
 * WHAT IT PRODUCES. A seater deck for an ordinary coach, and a two-tier berth
 * plan for a sleeper — the classes really are laid out differently, and a
 * sleeper drawn as rows of seats would be wrong rather than merely plain.
 *
 * DETERMINISM. Which berths are already sold is seeded from the service id, so
 * the same service always shows the same plan: reloading the seat screen must
 * not silently move someone's seat, and a booking made against a plan has to
 * still make sense when the ticket is opened later.
 *
 * PRIVACY: a plan describes geometry and area-level comfort signals. It never
 * says who is in a taken seat — `Seat` has no field that could.
 */
/** A stable hash, so a service id always produces the same plan. */
function hash(value) {
    let h = 2166136261;
    for (let i = 0; i < value.length; i++) {
        h ^= value.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
}
/** Deterministic pseudo-random in [0,1) from a seed and a counter. */
function noise(seed, index) {
    const x = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
    return x - Math.floor(x);
}
/** Columns either side of the aisle, by layout and deck kind. */
function columnsFor(layout, kind) {
    // A 2+1 sleeper is a double berth on one side and a single on the other,
    // which is what makes the single berths the premium ones.
    if (layout === '2+1')
        return { left: ['A', 'B'], right: ['C'] };
    return kind === 'sleeper'
        ? { left: ['A', 'B'], right: ['C', 'D'] }
        : { left: ['A', 'B'], right: ['C', 'D'] };
}
/**
 * Builds a plan for one service.
 *
 * Availability is scattered rather than blocked at one end, because a coach
 * fills unevenly and a plan with the first four rows solid and the rest empty
 * looks generated. The scatter is seeded, so it is stable.
 */
export function buildDeck(spec) {
    const { serviceId, kind, layout, totalSeats, seatsAvailable, accessibleBoardingPoint } = spec;
    const { left, right } = columnsFor(layout, kind);
    const perRow = left.length + right.length;
    const rows = Math.max(1, Math.ceil(totalSeats / perRow));
    const seed = hash(serviceId);
    // A sleeper splits its rows across two tiers; a seater is one floor.
    const lowerRows = kind === 'sleeper' ? Math.ceil(rows / 2) : rows;
    /*
        Pick the free seats up front rather than deciding seat by seat, so the
        count matches `seatsAvailable` exactly. A plan claiming "6 seats left"
        on a card and then offering nine would be worse than no plan at all.
    */
    const allIds = [];
    for (let row = 1; row <= rows; row++) {
        for (const column of [...left, ...right])
            allIds.push(`${row}${column}`);
    }
    const wanted = Math.max(0, Math.min(seatsAvailable, allIds.length));
    const shuffled = [...allIds]
        .map((id, index) => ({ id, key: noise(seed, index) }))
        .sort((a, b) => a.key - b.key)
        .slice(0, wanted)
        .map((entry) => entry.id);
    const free = new Set(shuffled);
    /* Area-level signals. Positions on the deck, never people. */
    const nearEntranceRows = [1, 2];
    const quieterFrom = Math.max(2, Math.round(rows * 0.35));
    const quieterTo = Math.max(quieterFrom, Math.round(rows * 0.65));
    // Step-free places sit by the front door, and only if the vehicle has them.
    const accessibleRows = accessibleBoardingPoint ? [1, 2] : [];
    const womenNearbyFrom = Math.max(1, Math.round(rows * 0.4));
    const womenNearbyTo = Math.min(rows, womenNearbyFrom + 3);
    const seats = [];
    for (let row = 1; row <= rows; row++) {
        for (const column of [...left, ...right]) {
            const id = `${row}${column}`;
            const available = free.has(id);
            const isRightSide = right.includes(column);
            const womenNearbyArea = row >= womenNearbyFrom && row <= womenNearbyTo && left.includes(column);
            const seat = {
                id,
                row,
                column,
                availability: available ? 'available' : 'unavailable',
                signals: {
                    // Outermost column each side is against the glass.
                    window: column === left[0] || column === right[right.length - 1],
                    aisle: column === left[left.length - 1] || column === right[0],
                    accessible: accessibleRows.includes(row) && isRightSide,
                    nearEntrance: nearEntranceRows.includes(row),
                    quieter: row >= quieterFrom && row <= quieterTo,
                    // Never surfaced on a seat nobody can pick.
                    womenNearby: womenNearbyArea && available
                }
            };
            if (kind === 'sleeper') {
                seat.berth = row <= lowerRows ? 'lower' : 'upper';
            }
            seats.push(seat);
        }
    }
    return {
        busId: serviceId,
        kind,
        layout,
        rows,
        leftColumns: left,
        rightColumns: right,
        seats
    };
}
/** The rows on one tier of a sleeper, in order. */
export function berthRows(deck, level) {
    const rows = new Set();
    for (const seat of deck.seats) {
        if (seat.berth === level)
            rows.add(seat.row);
    }
    return [...rows].sort((a, b) => a - b);
}
