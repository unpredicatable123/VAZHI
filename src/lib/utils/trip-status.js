import * as m from '$lib/paraglide/messages';
export function tripStatusLabel(status) {
    switch (status) {
        case 'scheduled':
            return m.trip_status_scheduled();
        case 'boarding':
            return m.trip_status_boarding();
        case 'departed':
            return m.trip_status_departed();
        case 'in-transit':
            return m.trip_status_in_transit();
        case 'completed':
            return m.trip_status_completed();
        case 'cancelled':
            return m.trip_status_cancelled();
    }
}
/**
 * Colour for a trip status.
 *
 * Boarding is the one that needs acting on, so it takes the warning tone; a
 * running service is primary; a finished one is success; a cancellation is the
 * only danger. Nothing invents a colour outside the theme tokens.
 */
export function tripStatusTone(status) {
    switch (status) {
        case 'scheduled':
            return 'neutral';
        case 'boarding':
            return 'warning';
        case 'departed':
        case 'in-transit':
            return 'primary';
        case 'completed':
            return 'success';
        case 'cancelled':
            return 'danger';
    }
}
export function crewStatusLabel(status) {
    switch (status) {
        case 'available':
            return m.crew_status_available();
        case 'assigned':
            return m.crew_status_assigned();
        case 'on-trip':
            return m.crew_status_on_trip();
        case 'off-duty':
            return m.crew_status_off_duty();
    }
}
export function crewStatusTone(status) {
    switch (status) {
        case 'available':
            return 'success';
        case 'assigned':
            return 'accent';
        case 'on-trip':
            return 'primary';
        case 'off-duty':
            return 'neutral';
    }
}
/**
 * The duty status a crew member is actually in, from the trip they hold.
 *
 * The roster status on the crew record is a starting point; what a crew member
 * is doing right now follows from their trip. Deriving it means the Operations
 * crew tables and the trip list can never disagree — and it is why a driver
 * shows as "On trip" the moment they press Departed.
 */
export function dutyStatusFrom(rosterStatus, assignedTripStatus) {
    if (rosterStatus === 'off-duty')
        return 'off-duty';
    if (!assignedTripStatus)
        return 'available';
    if (assignedTripStatus === 'boarding' || assignedTripStatus === 'departed')
        return 'on-trip';
    if (assignedTripStatus === 'in-transit')
        return 'on-trip';
    if (assignedTripStatus === 'completed' || assignedTripStatus === 'cancelled')
        return 'available';
    return 'assigned';
}
