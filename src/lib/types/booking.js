export const defaultComfortPreferences = {
    seatType: 'any',
    assistance: []
};
export function createEmptyPassenger() {
    return {
        fullName: '',
        age: null,
        gender: '',
        concession: 'none',
        accessibility: 'none'
    };
}
export const defaultNotificationPreferences = {
    pushEnabled: true,
    disruptionAlerts: true,
    boardingReminder: '30',
    womenNearbySignals: true
};
