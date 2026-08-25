/**
 * Transaction ledger and ticket email.
 *
 * Runs the real modules, not copies. Both are pure, so this needs no emulator
 * and no Firebase project: `npm run test:ledger`.
 *
 * Set PREVIEW_OUT to also write the rendered email somewhere for visual review.
 */
import { writeFileSync } from 'node:fs';
import { buildLedger, ledgerTotals } from '../src/lib/utils/ledger';
import {
	ticketEmailHtml,
	ticketEmailSubject,
	ticketEmailText
} from '../functions/src/ticket-email';
import type { Booking } from '../src/lib/types/booking';

let pass = 0;
let fail = 0;
function eq(label: string, actual: unknown, expected: unknown) {
	const a = JSON.stringify(actual);
	const b = JSON.stringify(expected);
	if (a === b) {
		pass++;
		console.log(`  ok    ${label}`);
	} else {
		fail++;
		console.log(`  FAIL  ${label}\n          got ${a}\n          want ${b}`);
	}
}
function check(label: string, condition: boolean, detail = '') {
	if (condition) {
		pass++;
		console.log(`  ok    ${label}${detail ? '  — ' + detail : ''}`);
	} else {
		fail++;
		console.log(`  FAIL  ${label}${detail ? '  — ' + detail : ''}`);
	}
}

function booking(over: Partial<Booking> = {}): Booking {
	return {
		pnr: 'VZ-1A0830',
		status: 'confirmed',
		tripId: 'TRIP-001',
		busId: 'bus-1',
		serviceName: 'SETC Ultra Deluxe',
		vehicleNumber: 'TN 01 AN 1234',
		originStopId: 'salem-new',
		destinationStopId: 'chennai-cmbt',
		originName: 'Salem New Bus Stand',
		destinationName: 'Chennai CMBT',
		departure: '08:30',
		arrival: '13:45',
		durationMinutes: 315,
		distanceKm: 340,
		boardingPlatform: '04',
		travelDate: '2026-09-02',
		seatIds: ['12A', '12B'],
		passengerCount: 2,
		fare: {
			passengerCount: 2,
			baseFarePerPassenger: 34000,
			taxesPerPassenger: 7000,
			baseFare: 68000,
			taxes: 14000,
			concessionDiscount: 0,
			concessionRequested: false,
			total: 82000
		},
		paymentMethod: 'upi',
		bookedAt: '2026-08-25T10:15:00.000Z',
		...over
	} as Booking;
}

console.log('LEDGER — a standing booking\n');
{
	const lines = buildLedger([booking()]);
	eq('produces one line', lines.length, 1);
	eq('...a payment', lines[0].kind, 'payment');
	eq('...marked paid', lines[0].status, 'paid');
	eq('...for the full fare', lines[0].amount, 82000);
	check('...carrying no passenger', !JSON.stringify(lines[0]).includes('name'));
}

console.log('\nLEDGER — a cancelled booking\n');
{
	const lines = buildLedger([
		booking({
			status: 'cancelled',
			refund: { status: 'simulated_pending', requestedAt: '2026-08-26T09:00:00.000Z' }
		})
	]);
	eq('produces two lines', lines.length, 2);
	eq('newest first: refund leads', lines[0].kind, 'refund');
	eq('...then the payment', lines[1].kind, 'payment');
	// 20% cancellation fee: 82000 paise paid, 16400 fee, 65600 back.
	eq('refund is the estimate the refund screen shows', lines[0].amount, 65600);
	eq('refund is pending', lines[0].status, 'refund_pending');
	eq('the payment reads as awaiting refund', lines[1].status, 'refund_pending');
	eq('both lines share the reference', lines[0].pnr, lines[1].pnr);
	check('line ids are distinct', lines[0].id !== lines[1].id, `${lines[0].id} / ${lines[1].id}`);
}

console.log('\nLEDGER — ordering and totals\n');
{
	const lines = buildLedger([
		booking({ pnr: 'VZ-OLD', bookedAt: '2026-01-01T00:00:00.000Z' }),
		booking({ pnr: 'VZ-NEW', bookedAt: '2026-08-01T00:00:00.000Z' }),
		booking({
			pnr: 'VZ-CANX',
			status: 'cancelled',
			bookedAt: '2026-05-01T00:00:00.000Z',
			refund: { status: 'simulated_pending', requestedAt: '2026-05-02T00:00:00.000Z' }
		})
	]);
	eq('newest first', lines.map((l) => l.pnr), ['VZ-NEW', 'VZ-CANX', 'VZ-CANX', 'VZ-OLD']);

	const totals = ledgerTotals(lines);
	eq('three payments counted', totals.bookings, 3);
	eq('paid is the sum of payments', totals.paid, 82000 * 3);
	eq('refunded is the refund line', totals.refunded, 65600);
	eq('net is paid less refunded', totals.net, 82000 * 3 - 65600);
}

console.log('\nLEDGER — a Firestore Timestamp instead of a string\n');
{
	const stamp = { toDate: () => new Date('2026-09-09T09:09:00.000Z') };
	const lines = buildLedger([
		booking({
			status: 'cancelled',
			refund: { status: 'simulated_pending', requestedAt: stamp as never }
		})
	]);
	const refundLine = lines.find((line) => line.kind === 'refund');
	eq('the Timestamp is normalised to ISO', refundLine?.at, '2026-09-09T09:09:00.000Z');
	eq('and it sorts above the payment it reverses', lines[0].kind, 'refund');
}

console.log('\nLEDGER — a refund with no timestamp yet\n');
{
	const lines = buildLedger([
		booking({ status: 'cancelled', refund: { status: 'simulated_pending' } })
	]);
	eq('falls back to the booking time, not the epoch', lines[0].at, '2026-08-25T10:15:00.000Z');
}

console.log('\nTICKET EMAIL\n');
{
	const ticket = {
		...booking(),
		passengers: [
			{ seatId: '12A', name: 'A Traveller' },
			{ seatId: '12B', name: 'B Traveller', concessionType: 'senior' }
		]
	};
	const html = ticketEmailHtml(ticket);
	const text = ticketEmailText(ticket);
	const subject = ticketEmailSubject(ticket);

	check('subject names the reference', subject.includes('VZ-1A0830'), subject);
	check('subject names the journey', subject.includes('Salem New Bus Stand'));
	check('html is a complete document', html.startsWith('<!doctype html>') && html.includes('</html>'));
	check('html has no unresolved template holes', !html.includes('undefined') && !html.includes('NaN'));
	check('reference appears in html', html.includes('VZ-1A0830'));
	check('platform appears in html', html.includes('>04<'));
	check('both seats appear', html.includes('12A') && html.includes('12B'));
	check('fare renders as rupees', html.includes('₹820'), '82000 paise');
	check('base and taxes render', html.includes('₹680') && html.includes('₹140'));
	check('date is written out', html.includes('Wed, 2 Sep 2026'));
	check('tamil labels present', html.includes('முன்பதிவு எண்'));
	check('layout is table-based, not flex', !html.includes('display:flex') && html.includes('<table'));
	check('no external asset host', !/https?:\/\/(?!schema)/.test(html.replace(/lang="en"/, '')));
	check('text alternative carries the reference', text.includes('VZ-1A0830'));
	check('text alternative lists passengers', text.includes('12A — A Traveller'));
	check('text alternative states the total', text.includes('₹820'));

	// Escaping: a name is user input and must not be able to inject markup.
	const hostile = ticketEmailHtml({
		...ticket,
		passengers: [{ seatId: '1A', name: '<script>alert(1)</script>' }]
	});
	check('passenger names are escaped', !hostile.includes('<script>alert(1)</script>'));
	check('...and rendered as text', hostile.includes('&lt;script&gt;'));

	if (process.env.PREVIEW_OUT) {
		writeFileSync(process.env.PREVIEW_OUT, html, 'utf8');
		console.log(`
  wrote ${process.env.PREVIEW_OUT} for visual review`);
	}
}

console.log(`\n--- ${pass} passed, ${fail} failed ---`);
process.exit(fail ? 1 : 0);
