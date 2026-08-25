/**
 * Ticket email composition.
 *
 * WHY IT LOOKS LIKE 2005 IN HERE. Email clients are not browsers. Outlook
 * renders with Word's HTML engine, Gmail strips <style> blocks in some
 * contexts, and flexbox, grid, and external stylesheets are unreliable
 * everywhere. So this builds nested tables with inline styles and a fixed
 * 600px content width — the one layout every client agrees on. Resist
 * modernising it.
 *
 * BILINGUAL. Tamil Nadu transit tickets carry both scripts, and VAZHI does not
 * store which language a traveller reads in. Rather than guess, every label is
 * printed in English with its Tamil form beneath, which is also what a printed
 * TNSTC ticket does.
 *
 * PRIVACY. This message goes to the address on the traveller's own Firebase
 * Auth account and contains only their own booking: the journey, their seats,
 * the names they entered for the passengers travelling, and what they paid.
 * The address is read at send time from Auth and is never written to Firestore.
 */

export interface TicketPassenger {
	seatId: string;
	name: string;
	concessionType?: string;
}

export interface TicketBooking {
	pnr: string;
	serviceName: string;
	vehicleNumber: string;
	originName: string;
	destinationName: string;
	departure: string;
	arrival: string;
	travelDate: string;
	boardingPlatform: string;
	seatIds: string[];
	passengerCount: number;
	passengers?: TicketPassenger[];
	fare: {
		baseFare: number;
		taxes: number;
		total: number;
	};
	paymentMethod: string;
	bookedAt: string;
}

/* VAZHI's own tokens, so the email and the app are recognisably one product. */
const GREEN = '#4a7c59';
const SAGE = '#86a789';
const INK = '#1a1a1a';
const MUTED = '#555555';
const LINE = '#e2e3dd';
const PAPER = '#fafaf7';
const SOFT = '#e6efe8';

const FONT =
	"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans Tamil',Helvetica,Arial,sans-serif";

/** Escapes the five characters that can break out of HTML text or an attribute. */
function esc(value: unknown): string {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/** Paise to a rupee string. Fares are whole rupees throughout VAZHI. */
function rupees(paise: number): string {
	return `₹${Math.round(Number(paise ?? 0) / 100).toLocaleString('en-IN')}`;
}

/** 2026-08-25 → Tue, 25 Aug 2026. Built by hand so no locale data is needed. */
function longDate(iso: string): string {
	const [y, m, d] = String(iso).split('-').map(Number);
	if (!y || !m || !d) return String(iso);
	const date = new Date(Date.UTC(y, m - 1, d));
	const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const months = [
		'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
		'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
	];
	return `${days[date.getUTCDay()]}, ${d} ${months[m - 1]} ${y}`;
}

/** A label in both scripts, stacked. */
function label(english: string, tamil: string): string {
	return (
		`<span style="display:block;font-size:11px;line-height:1.4;letter-spacing:.08em;` +
		`text-transform:uppercase;color:${MUTED};">${esc(english)}</span>` +
		`<span style="display:block;font-size:11px;line-height:1.5;color:${MUTED};">${esc(tamil)}</span>`
	);
}

/** One label/value pair as a table row. */
function row(english: string, tamil: string, value: string, mono = false): string {
	const family = mono ? "'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace" : FONT;
	return (
		`<tr>` +
		`<td style="padding:10px 0;border-bottom:1px solid ${LINE};width:45%;vertical-align:top;">` +
		label(english, tamil) +
		`</td>` +
		`<td style="padding:10px 0;border-bottom:1px solid ${LINE};text-align:right;vertical-align:top;` +
		`font-family:${family};font-size:15px;font-weight:600;color:${INK};">${esc(value)}</td>` +
		`</tr>`
	);
}

/**
 * The full HTML message.
 *
 * Structure: masthead, the PNR as the single most prominent thing on the page,
 * the journey as an origin/arrow/destination band, then boarding facts, seats
 * and passengers, and the fare. A traveller at a bus stand is looking for two
 * things — which platform, and what their seat is — so those sit above the fare.
 */
export function ticketEmailHtml(booking: TicketBooking): string {
	const seats = booking.seatIds.join(', ');
	const passengers = booking.passengers ?? [];

	const passengerRows = passengers
		.map(
			(passenger) =>
				`<tr>` +
				`<td style="padding:8px 12px;border-bottom:1px solid ${LINE};font-size:14px;color:${INK};">` +
				`${esc(passenger.name)}` +
				(passenger.concessionType
					? `<span style="display:block;font-size:12px;color:${MUTED};">${esc(passenger.concessionType)} concession</span>`
					: '') +
				`</td>` +
				`<td style="padding:8px 12px;border-bottom:1px solid ${LINE};text-align:right;` +
				`font-family:'SFMono-Regular',Consolas,monospace;font-size:14px;font-weight:700;color:${GREEN};">` +
				`${esc(passenger.seatId)}</td>` +
				`</tr>`
		)
		.join('');

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>VAZHI ticket ${esc(booking.pnr)}</title>
</head>
<body style="margin:0;padding:0;background:${PAPER};">
<!-- Preheader: what the inbox list shows before the message is opened. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">
${esc(booking.pnr)} · ${esc(booking.originName)} to ${esc(booking.destinationName)} · ${esc(longDate(booking.travelDate))} · Platform ${esc(booking.boardingPlatform)}
</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PAPER};">
<tr><td align="center" style="padding:24px 12px;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:100%;background:#ffffff;border:1px solid ${LINE};border-radius:12px;overflow:hidden;font-family:${FONT};">

  <!-- Masthead -->
  <tr><td style="background:${GREEN};padding:22px 28px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="font-size:20px;font-weight:700;letter-spacing:.02em;color:#ffffff;">VAZHI <span style="font-weight:400;opacity:.85;">வழி</span></td>
      <td align="right" style="font-size:12px;color:#dbe7de;">Confirmed · உறுதி</td>
    </tr></table>
  </td></tr>

  <!-- Booking reference: the one thing a conductor asks for -->
  <tr><td style="padding:28px 28px 8px;text-align:center;">
    ${label('Booking reference', 'முன்பதிவு எண்')}
    <div style="margin-top:8px;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;
      font-size:30px;font-weight:700;letter-spacing:.06em;color:${GREEN};">${esc(booking.pnr)}</div>
    <div style="margin-top:10px;display:inline-block;background:${SOFT};color:#2f5340;
      font-size:12px;font-weight:600;padding:5px 12px;border-radius:999px;">
      Show this reference when boarding
    </div>
  </td></tr>

  <!-- Journey -->
  <tr><td style="padding:22px 28px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="border:1px solid ${LINE};border-radius:10px;">
      <tr>
        <td style="padding:16px 18px;width:42%;vertical-align:top;">
          <div style="font-size:22px;font-weight:700;color:${INK};line-height:1.2;">${esc(booking.departure)}</div>
          <div style="font-size:14px;color:${INK};margin-top:4px;">${esc(booking.originName)}</div>
        </td>
        <td style="padding:16px 4px;text-align:center;vertical-align:middle;color:${SAGE};font-size:18px;">&rarr;</td>
        <td style="padding:16px 18px;width:42%;text-align:right;vertical-align:top;">
          <div style="font-size:22px;font-weight:700;color:${INK};line-height:1.2;">${esc(booking.arrival)}</div>
          <div style="font-size:14px;color:${INK};margin-top:4px;">${esc(booking.destinationName)}</div>
        </td>
      </tr>
      <tr><td colspan="3" style="padding:0 18px 16px;border-top:1px solid ${LINE};">
        <div style="padding-top:12px;font-size:14px;color:${MUTED};">
          ${esc(longDate(booking.travelDate))} &nbsp;·&nbsp; ${esc(booking.serviceName)}
        </div>
      </td></tr>
    </table>
  </td></tr>

  <!-- Boarding facts -->
  <tr><td style="padding:22px 28px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${row('Platform', 'நடைமேடை', booking.boardingPlatform, true)}
      ${row('Vehicle', 'வாகனம்', booking.vehicleNumber, true)}
      ${row('Seats', 'இருக்கைகள்', seats, true)}
      ${row('Passengers', 'பயணிகள்', String(booking.passengerCount))}
    </table>
  </td></tr>

  ${
		passengerRows
			? `<!-- Who is travelling, and in which seat -->
  <tr><td style="padding:22px 28px 0;">
    <div style="margin-bottom:8px;">${label('Passengers and seats', 'பயணிகள் மற்றும் இருக்கைகள்')}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="border:1px solid ${LINE};border-radius:10px;border-collapse:separate;overflow:hidden;">
      ${passengerRows}
    </table>
  </td></tr>`
			: ''
	}

  <!-- Fare -->
  <tr><td style="padding:22px 28px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${row('Base fare', 'அடிப்படைக் கட்டணம்', rupees(booking.fare.baseFare))}
      ${row('Taxes', 'வரிகள்', rupees(booking.fare.taxes))}
      <tr>
        <td style="padding:14px 0 0;vertical-align:top;">${label('Total paid', 'மொத்தம் செலுத்தியது')}</td>
        <td style="padding:14px 0 0;text-align:right;font-size:22px;font-weight:700;color:${GREEN};">
          ${esc(rupees(booking.fare.total))}
        </td>
      </tr>
      <tr><td colspan="2" style="padding-top:6px;font-size:12px;color:${MUTED};">
        Paid by ${esc(booking.paymentMethod)} · Demonstration payment, no money moved
      </td></tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:26px 28px 28px;">
    <div style="border-top:1px solid ${LINE};padding-top:16px;font-size:12px;line-height:1.6;color:${MUTED};">
      Carry a photo ID that matches the passenger name. Boarding closes 10 minutes before departure.<br>
      <span style="color:#6e766f;">This ticket was sent to the address on your VAZHI account. We never
      ask for card details, OTPs, or passwords by email.</span>
    </div>
  </td></tr>

</table>
<div style="font-family:${FONT};font-size:11px;color:#6e766f;padding:14px 0 0;">VAZHI · Tamil Nadu public transit</div>
</td></tr>
</table>
</body>
</html>`;
}

/**
 * Plain-text alternative.
 *
 * Not decoration: some clients prefer it, screen readers handle it better, and
 * it is what shows in a notification preview. Every fact in the HTML appears
 * here too.
 */
export function ticketEmailText(booking: TicketBooking): string {
	const lines = [
		`VAZHI — Ticket confirmed`,
		``,
		`Booking reference: ${booking.pnr}`,
		``,
		`${booking.originName} ${booking.departure}  ->  ${booking.destinationName} ${booking.arrival}`,
		`${longDate(booking.travelDate)}`,
		`${booking.serviceName} (${booking.vehicleNumber})`,
		``,
		`Platform: ${booking.boardingPlatform}`,
		`Seats: ${booking.seatIds.join(', ')}`,
		`Passengers: ${booking.passengerCount}`
	];

	for (const passenger of booking.passengers ?? []) {
		lines.push(`  ${passenger.seatId} — ${passenger.name}`);
	}

	lines.push(
		``,
		`Base fare: ${rupees(booking.fare.baseFare)}`,
		`Taxes: ${rupees(booking.fare.taxes)}`,
		`Total paid: ${rupees(booking.fare.total)} (${booking.paymentMethod})`,
		`Demonstration payment — no money moved.`,
		``,
		`Show your booking reference when boarding. Carry a photo ID matching the`,
		`passenger name. Boarding closes 10 minutes before departure.`,
		``,
		`Sent to the address on your VAZHI account. We never ask for card details,`,
		`OTPs, or passwords by email.`
	);

	return lines.join('\n');
}

/** Subject line: recognisable in a crowded inbox without being opened. */
export function ticketEmailSubject(booking: TicketBooking): string {
	return `VAZHI ticket ${booking.pnr} — ${booking.originName} to ${booking.destinationName}, ${longDate(booking.travelDate)}`;
}
