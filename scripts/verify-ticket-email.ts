import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

/**
 * Proves a ticket email went to the address the traveller signs in with.
 *
 * Reads only — it books nothing, sends nothing, and changes nothing. It takes
 * the most recent booking (or a PNR you name), resolves the traveller through
 * Firebase Auth, and checks that the queued message was addressed to that same
 * account. Then it reports what the mail extension did with it.
 *
 * Requires Admin credentials, like the seed script:
 *
 *   $env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\secure\your-key.json'
 *   npm run firebase:verify:email
 *   npm run firebase:verify:email -- --pnr=VZ-XXXXXXXXXX
 *   Remove-Item Env:GOOGLE_APPLICATION_CREDENTIALS
 *
 * PRIVACY: addresses are masked in everything it prints, so the output can be
 * pasted into a chat or an issue without leaking a traveller's email. The
 * comparison itself is done on the full values.
 */

const requireFromFunctions = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp, applicationDefault } = requireFromFunctions('firebase-admin/app');
const { getFirestore } = requireFromFunctions('firebase-admin/firestore');
const { getAuth } = requireFromFunctions('firebase-admin/auth');

function argument(name: string): string | undefined {
	const withEquals = process.argv.find((value) => value.startsWith(`--${name}=`));
	if (withEquals) return withEquals.slice(name.length + 3);
	const index = process.argv.indexOf(`--${name}`);
	return index >= 0 ? process.argv[index + 1] : undefined;
}

async function projectId(): Promise<string> {
	const named = argument('project');
	if (named) return named;
	const rc = JSON.parse(await readFile(new URL('../.firebaserc', import.meta.url), 'utf8'));
	const value = rc?.projects?.default;
	if (!value) throw new Error('No project in .firebaserc; pass --project=<id>.');
	return value;
}

/** `someone@example.com` → `s*****e@example.com`. Enough to recognise, not to read. */
function mask(address: string): string {
	const [user, domain] = address.split('@');
	if (!domain) return '***';
	const visible = user.length <= 2 ? user[0] : `${user[0]}${'*'.repeat(user.length - 2)}${user.at(-1)}`;
	return `${visible}@${domain}`;
}

let failures = 0;
function check(label: string, passed: boolean, detail = ''): void {
	if (!passed) failures++;
	console.log(`  ${passed ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`);
}

async function main(): Promise<void> {
	if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
		throw new Error(
			'Set GOOGLE_APPLICATION_CREDENTIALS to an Admin service-account key first. See FIREBASE.md.'
		);
	}

	initializeApp({ credential: applicationDefault(), projectId: await projectId() });
	const db = getFirestore();

	const wanted = argument('pnr')?.trim().toUpperCase();
	const snapshot = wanted
		? await db.collection('bookings').doc(wanted).get()
		: (await db.collection('bookings').orderBy('createdAt', 'desc').limit(1).get()).docs[0];

	if (!snapshot?.exists) {
		console.log(
			wanted
				? `No booking ${wanted}. Book a seat first, or check the PNR.`
				: 'No bookings exist yet. Book a seat on the site, then run this again.'
		);
		process.exit(1);
	}

	const booking = snapshot.data()!;
	const pnr = snapshot.id;
	console.log(`Booking ${pnr}\n`);

	/* ---- who the booking says made it ---- */
	const travellerId = String(booking.travellerId ?? '');
	check('booking records a traveller', travellerId !== '');

	const user = await getAuth().getUser(travellerId);
	const signInEmail = user.email ?? '';
	check('that account has a sign-in email', signInEmail !== '', mask(signInEmail));

	/* ---- what was actually queued ---- */
	const mail = await db.collection('mail').doc(`ticket-${pnr}`).get();
	check('a ticket email was queued for this booking', mail.exists, `mail/ticket-${pnr}`);
	if (!mail.exists) {
		console.log('\n  The trigger did not queue anything. Check: npx firebase functions:log --only sendTicketEmail');
		process.exit(1);
	}

	const queued = mail.data()!;
	const recipients: string[] = Array.isArray(queued.to) ? queued.to.map(String) : [];
	check('addressed to exactly one recipient', recipients.length === 1, String(recipients.length));
	check(
		'THE RECIPIENT IS THE SIGN-IN EMAIL',
		recipients[0] === signInEmail,
		`${mask(recipients[0] ?? '')} vs ${mask(signInEmail)}`
	);

	/* ---- the message itself ---- */
	const message = queued.message ?? {};
	check('subject names the booking', String(message.subject ?? '').includes(pnr));
	check('has an HTML body', String(message.html ?? '').includes('<!doctype html>'));
	check('has a plain-text alternative', String(message.text ?? '').includes(pnr));

	/* ---- what the extension did with it ---- */
	const delivery = queued.delivery;
	if (!delivery) {
		console.log('\n  Queued, but the extension has not picked it up yet. Re-run in a moment.');
	} else {
		const state = String(delivery.state);
		check('delivery reached a final state', state === 'SUCCESS' || state === 'ERROR', state);
		check('delivery succeeded', state === 'SUCCESS', state);
		if (delivery.error) console.log(`\n  SMTP error: ${delivery.error}`);
		if (delivery.info?.accepted?.length) {
			console.log(`  accepted by the server for: ${delivery.info.accepted.map((a: string) => mask(a)).join(', ')}`);
		}
		if (delivery.expireAt) console.log('  TTL stamp present on the queued message');
	}

	console.log(`\n--- ${failures === 0 ? 'PASS' : `${failures} FAILED`} ---`);
	process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
