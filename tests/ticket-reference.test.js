import { referenceFromScan } from '../src/lib/utils/ticket-reference';
/**
 * What a conductor's camera is allowed to act on.
 *
 * Pure, so it needs no emulator and no camera: `npm run test:scan`.
 */
let pass = 0;
let fail = 0;
function eq(label, actual, expected) {
    if (JSON.stringify(actual) === JSON.stringify(expected)) {
        pass++;
        console.log(`  ok    ${label}`);
    }
    else {
        fail++;
        console.log(`  FAIL  ${label}\n          got ${JSON.stringify(actual)}\n          want ${JSON.stringify(expected)}`);
    }
}
console.log('A VAZHI TICKET — the URL the QR actually encodes\n');
eq('production ticket', referenceFromScan('https://vazhi-9a321.web.app/conductor/verify?pnr=VZ-DE67A8D7A6'), 'VZ-DE67A8D7A6');
eq('localhost, during development', referenceFromScan('http://localhost:5173/conductor/verify?pnr=VZ-11D0830'), 'VZ-11D0830');
eq('reference lower-cased by some re-encoder', referenceFromScan('https://vazhi-9a321.web.app/conductor/verify?pnr=vz-de67a8d7a6'), 'VZ-DE67A8D7A6');
eq('extra query parameters alongside it', referenceFromScan('https://vazhi-9a321.web.app/conductor/verify?utm=x&pnr=VZ-ABC123&y=2'), 'VZ-ABC123');
console.log('\nA BARE REFERENCE — a ticket reprinted elsewhere\n');
eq('plain', referenceFromScan('VZ-DE67A8D7A6'), 'VZ-DE67A8D7A6');
eq('lower case', referenceFromScan('vz-de67a8d7a6'), 'VZ-DE67A8D7A6');
eq('padded with whitespace', referenceFromScan('  VZ-ABC123  '), 'VZ-ABC123');
console.log('\nNOT A TICKET — refused rather than typed into the field\n');
for (const [label, input] of [
    ['empty', ''],
    ['whitespace only', '   '],
    ['a website', 'https://example.com'],
    ['our site with no reference', 'https://vazhi-9a321.web.app/conductor/verify'],
    ['our site with a junk reference', 'https://vazhi-9a321.web.app/conductor/verify?pnr=hello'],
    ['a UPI payment code', 'upi://pay?pa=someone@bank&am=410'],
    ['a wifi code', 'WIFI:S:DepotWiFi;T:WPA;P:hunter2;;'],
    ['plain words', 'boarding pass'],
    ['a reference with punctuation', 'VZ-ABC/123'],
    ['the prefix alone', 'VZ-'],
    ['a different operator', 'XY-ABC123']
]) {
    eq(label, referenceFromScan(input), null);
}
console.log('\nA URL IS NEVER TREATED AS A BARE REFERENCE\n');
// Guards the fall-through: a parseable URL must not reach the bare check and
// smuggle something through on the strength of its own text.
eq('a URL whose text contains a reference', referenceFromScan('https://evil.example/VZ-ABC123'), null);
console.log(`\n--- ${pass} passed, ${fail} failed ---`);
process.exit(fail ? 1 : 0);
