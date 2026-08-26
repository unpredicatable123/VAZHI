/**
 * Client-side ticket file generation.
 *
 * Both helpers build their payload from the `Booking` record only, which has
 * no passenger name, age, or gender field — so a saved ticket or a calendar
 * entry cannot leak identity. Files are produced with a blob URL; nothing is
 * uploaded anywhere.
 */
function download(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}
/** Plain-text ticket a traveller can keep offline. */
export function saveTicketFile(booking, labels) {
    const lines = [
        `${labels.app} — ${labels.ticket}`,
        '',
        `${labels.pnr}: ${booking.pnr}`,
        `${labels.service}: ${booking.serviceName} (${booking.vehicleNumber})`,
        `${labels.date}: ${booking.travelDate}`,
        `${booking.originName} ${booking.departure} -> ${booking.destinationName} ${booking.arrival}`,
        `${labels.platform}: ${booking.boardingPlatform}`,
        `${labels.seats}: ${booking.seatIds.join(', ')}`,
        `${labels.total}: INR ${(booking.fare.total / 100).toFixed(0)}`,
        '',
        labels.privacy
    ];
    download(`vazhi-ticket-${booking.pnr}.txt`, lines.join('\n'), 'text/plain;charset=utf-8');
}
/** Escapes the characters iCalendar treats as delimiters. */
function icsEscape(value) {
    return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,');
}
function icsStamp(date, time) {
    return `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;
}
/** Calendar entry for the departure. Journey data only, never a passenger. */
export function saveCalendarFile(booking, labels) {
    const summary = `${booking.originName} → ${booking.destinationName} (${booking.serviceName})`;
    const description = [
        `${labels.pnr}: ${booking.pnr}`,
        `${labels.platform}: ${booking.boardingPlatform}`,
        `${labels.seats}: ${booking.seatIds.join(', ')}`,
        `${labels.vehicle}: ${booking.vehicleNumber}`
    ].join('\\n');
    const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//VAZHI//Transit//EN',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        `UID:${booking.pnr}@vazhi.local`,
        `DTSTAMP:${icsStamp(booking.travelDate, booking.departure)}`,
        `DTSTART:${icsStamp(booking.travelDate, booking.departure)}`,
        `DTEND:${icsStamp(booking.travelDate, booking.arrival)}`,
        `SUMMARY:${icsEscape(summary)}`,
        `LOCATION:${icsEscape(booking.originName)}`,
        `DESCRIPTION:${description}`,
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');
    download(`vazhi-journey-${booking.pnr}.ics`, ics, 'text/calendar;charset=utf-8');
}
