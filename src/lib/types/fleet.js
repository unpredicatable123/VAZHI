/** Duty statuses in the order they are listed and counted. */
export const crewStatuses = ['available', 'assigned', 'on-trip', 'off-duty'];
/** Statuses in running order, for progress rendering and transition checks. */
export const tripStatusSequence = [
    'scheduled',
    'boarding',
    'departed',
    'in-transit',
    'completed'
];
/** Every status, in the order the Operations dashboard lists them. */
export const tripStatuses = [...tripStatusSequence, 'cancelled'];
