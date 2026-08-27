import { createHash } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

const minute = 60_000;

/** Central policy table for every browser-callable backend operation. */
export const rateLimits = Object.freeze({
    publicSearch: { limit: 30, windowMs: minute, scope: 'ip' },
    read: { limit: 60, windowMs: minute, scope: 'user' },
    mutation: { limit: 10, windowMs: minute, scope: 'user' },
    paymentOrder: { limit: 3, windowMs: minute, scope: 'user' },
    paymentVerify: { limit: 10, windowMs: minute, scope: 'user' },
    ticketScan: { limit: 30, windowMs: minute, scope: 'user' },
    account: { limit: 5, windowMs: minute, scope: 'user' }
});

/** Pure fixed-window calculation, exported so boundary behaviour stays tested. */
export function consumeWindow(previous, nowMs, limit, windowMs) {
    const previousStart = Number(previous?.windowStartedAtMs);
    const inWindow = Number.isFinite(previousStart) && nowMs - previousStart < windowMs;
    const windowStartedAtMs = inWindow ? previousStart : nowMs;
    const previousCount = Number(previous?.count);
    const count = inWindow && Number.isFinite(previousCount) && previousCount >= 0 ? previousCount : 0;
    if (count >= limit) {
        return {
            allowed: false,
            count,
            windowStartedAtMs,
            retryAfterSeconds: Math.max(1, Math.ceil((windowStartedAtMs + windowMs - nowMs) / 1000))
        };
    }
    return {
        allowed: true,
        count: count + 1,
        windowStartedAtMs,
        retryAfterSeconds: 0
    };
}

function requestSubject(request, scope) {
    if (scope === 'user') {
        const uid = request.auth?.uid;
        if (!uid)
            throw new HttpsError('unauthenticated', 'Authentication required.');
        return `user:${uid}`;
    }
    const address = request.rawRequest?.ip ?? request.rawRequest?.socket?.remoteAddress ?? 'unknown';
    return `ip:${address}`;
}

/**
 * Enforces a distributed limit with one compact Firestore document per
 * endpoint and caller. Raw IP addresses are never persisted.
 */
export async function enforceRateLimit(db, request, action, policy) {
    const subject = requestSubject(request, policy.scope);
    const key = createHash('sha256').update(`${action}:${subject}`).digest('hex');
    const ref = db.collection('_rateLimits').doc(key);
    const nowMs = Date.now();
    await db.runTransaction(async (tx) => {
        const snapshot = await tx.get(ref);
        const stored = snapshot.data();
        const decision = consumeWindow({
            count: stored?.count,
            windowStartedAtMs: stored?.windowStartedAt instanceof Timestamp
                ? stored.windowStartedAt.toMillis()
                : undefined
        }, nowMs, policy.limit, policy.windowMs);
        if (!decision.allowed) {
            throw new HttpsError('resource-exhausted', 'Too many requests. Please try again shortly.', {
                retryAfterSeconds: decision.retryAfterSeconds
            });
        }
        tx.set(ref, {
            action,
            count: decision.count,
            windowStartedAt: Timestamp.fromMillis(decision.windowStartedAtMs),
            expiresAt: Timestamp.fromMillis(decision.windowStartedAtMs + policy.windowMs),
            updatedAt: Timestamp.fromMillis(nowMs)
        });
    });
}
