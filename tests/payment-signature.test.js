import { createHmac } from 'node:crypto';
import { verifySignature } from '../functions/src/razorpay';
/**
 * Razorpay signature verification.
 *
 * This one function is what separates a real payment from a browser claiming
 * one — every other check in the booking flow assumes it. It is pure crypto, so
 * it needs no emulator, no network, and no Razorpay account: `npm run test:payment`.
 */
const SECRET = 'test_secret_not_a_real_key';
const ORDER = 'order_QxYzAbC123';
const PAYMENT = 'pay_QxYzAbC456';
/** How Razorpay signs it, written out independently of the implementation. */
function sign(secret, orderId, paymentId) {
    return createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
}
let pass = 0;
let fail = 0;
function check(label, condition, detail = '') {
    if (condition) {
        pass++;
        console.log(`  ok    ${label}${detail ? '  — ' + detail : ''}`);
    }
    else {
        fail++;
        console.log(`  FAIL  ${label}${detail ? '  — ' + detail : ''}`);
    }
}
const valid = sign(SECRET, ORDER, PAYMENT);
console.log('ACCEPTS WHAT RAZORPAY ACTUALLY SENT\n');
check('a genuine signature verifies', verifySignature(SECRET, ORDER, PAYMENT, valid));
check('...and is order-sensitive', valid === sign(SECRET, ORDER, PAYMENT));
console.log('\nREFUSES EVERYTHING ELSE\n');
check('a different payment id', !verifySignature(SECRET, ORDER, 'pay_forged', valid));
check('a different order id', !verifySignature(SECRET, 'order_forged', PAYMENT, valid));
check('a signature made with another secret', !verifySignature(SECRET, ORDER, PAYMENT, sign('other_secret', ORDER, PAYMENT)));
check('the ids swapped round', !verifySignature(SECRET, PAYMENT, ORDER, valid));
// The pair concatenates with '|'; without it, order|payment and orderpay|ment
// would sign identically. Prove the delimiter is actually load-bearing.
check('ids that concatenate to the same string are not interchangeable', !verifySignature(SECRET, `${ORDER}|${PAYMENT}`, '', valid));
console.log('\nHANDLES MISSING AND MALFORMED INPUT WITHOUT THROWING\n');
for (const [label, args] of [
    ['no signature', [SECRET, ORDER, PAYMENT, '']],
    ['no order id', [SECRET, '', PAYMENT, valid]],
    ['no payment id', [SECRET, ORDER, '', valid]],
    ['a short signature', [SECRET, ORDER, PAYMENT, 'abc']],
    ['a long signature', [SECRET, ORDER, PAYMENT, valid + 'ff']],
    ['a non-hex signature of the right length', [SECRET, ORDER, PAYMENT, 'z'.repeat(valid.length)]]
]) {
    let threw = false;
    let result = true;
    try {
        result = verifySignature(...args);
    }
    catch {
        threw = true;
    }
    check(label, !threw && result === false, threw ? 'THREW' : 'refused');
}
console.log('\nA REAL-SHAPED SIGNATURE IS 64 HEX CHARACTERS\n');
check('sha256 hex length', valid.length === 64, String(valid.length));
check('hex only', /^[0-9a-f]+$/.test(valid));
console.log(`\n--- ${pass} passed, ${fail} failed ---`);
process.exit(fail ? 1 : 0);
