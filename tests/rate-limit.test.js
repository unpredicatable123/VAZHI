import { consumeWindow, enforceRateLimit, rateLimits } from '../functions/src/rate-limit.js';

let pass = 0;
let fail = 0;
function check(label, condition, detail = '') {
    if (condition) {
        pass++;
        console.log(`  ok    ${label}${detail ? ` — ${detail}` : ''}`);
    }
    else {
        fail++;
        console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
    }
}

const minute = 60_000;
console.log('FIXED-WINDOW BOUNDARIES\n');
let state;
for (let index = 0; index < 30; index++) {
    state = consumeWindow(state, 1_000, 30, minute);
}
check('the first 30 requests are accepted', state.allowed && state.count === 30);

const blocked = consumeWindow(state, 1_000, 30, minute);
check('request 31 is rejected', !blocked.allowed && blocked.count === 30);
check('a rejected request does not consume another slot', blocked.count === state.count);
check('retry delay covers the remaining window', blocked.retryAfterSeconds === 60);

const halfway = consumeWindow(state, 31_000, 30, minute);
check('the same window remains blocked', !halfway.allowed);
check('retry delay decreases with time', halfway.retryAfterSeconds === 30);

const reset = consumeWindow(state, 61_000, 30, minute);
check('a completed window resets the counter', reset.allowed && reset.count === 1);
check('the new window starts at the new request', reset.windowStartedAtMs === 61_000);

console.log('\nPOLICY TIERS\n');
check('public search is capped at 30/minute', rateLimits.publicSearch.limit === 30);
check('payment orders are capped at 3/minute', rateLimits.paymentOrder.limit === 3);
check('authenticated reads are capped at 60/minute', rateLimits.read.limit === 60);
check('mutations are capped at 10/minute', rateLimits.mutation.limit === 10);
check('ticket scans are capped at 30/minute', rateLimits.ticketScan.limit === 30);

console.log('\nDISTRIBUTED ENFORCEMENT\n');
class FakeDb {
    docs = new Map();
    collection(name) {
        return { doc: (id) => ({ name, id }) };
    }
    async runTransaction(work) {
        return work({
            get: async (ref) => ({ data: () => this.docs.get(`${ref.name}/${ref.id}`) }),
            set: (ref, value) => this.docs.set(`${ref.name}/${ref.id}`, value)
        });
    }
}
const db = new FakeDb();
const originalNow = Date.now;
Date.now = () => 1_000;
try {
    const request = { rawRequest: { ip: '203.0.113.9' } };
    for (let index = 0; index < 30; index++)
        await enforceRateLimit(db, request, 'searchTrips', rateLimits.publicSearch);
    let throttled;
    try {
        await enforceRateLimit(db, request, 'searchTrips', rateLimits.publicSearch);
    }
    catch (error) {
        throttled = error;
    }
    check('the Firestore-backed limiter rejects request 31', throttled?.code === 'resource-exhausted');
    check('the response includes a retry delay', throttled?.details?.retryAfterSeconds === 60);
    const storedKey = [...db.docs.keys()][0] ?? '';
    check('the raw caller address is not persisted', !storedKey.includes('203.0.113.9'));

    const users = new FakeDb();
    await enforceRateLimit(users, { auth: { uid: 'user-a' } }, 'holdSeats', rateLimits.mutation);
    await enforceRateLimit(users, { auth: { uid: 'user-b' } }, 'holdSeats', rateLimits.mutation);
    check('authenticated callers receive independent counters', users.docs.size === 2);
}
finally {
    Date.now = originalNow;
}

console.log(`\n--- ${pass} passed, ${fail} failed ---`);
process.exit(fail ? 1 : 0);
