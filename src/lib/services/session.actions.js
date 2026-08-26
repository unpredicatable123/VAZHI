import { clearIndexedDbPersistence, terminate } from 'firebase/firestore';
import * as m from '$lib/paraglide/messages';
import { signOut } from './auth.service';
import { toasts } from '$stores/toast.svelte';
import { signInPathFor } from '$utils/route-access';
import { forgetAssignment } from './conductor.service';
import { db, firebaseConfigured } from '$lib/firebase/client';
import { boarding } from '$stores/boarding.svelte';
import { bookingDraft } from '$stores/booking.svelte';
import { passengers } from '$stores/passengers.svelte';
import { session } from '$stores/session.svelte';
import { fleet } from '$stores/fleet.svelte';
import { trips } from '$stores/trips.svelte';
/**
 * Ends a session and clears every piece of role-specific working state.
 *
 * Kept in one place so signing out can never leave a half-cleared workspace:
 * passenger details (the only PII in the app) and the booking draft are wiped
 * for a traveller, boarding progress for a conductor, and trip status changes,
 * scheduled trips, and fleet and roster edits for a driver or controller. Every role is cleared
 * regardless of who signed out, so a shared depot device never hands the next
 * person the previous person's workspace.
 *
 * Clearing the stores is not sufficient on its own. Firestore is configured
 * with a persistent local cache, so every document a session read — a trip, a
 * roster entry, a boarding manifest — is also sitting in IndexedDB and would
 * still be there for whoever signs in next. `discardCachedData` empties it, and
 * because that leaves the Firestore instance terminated, sign-out must finish
 * with a full page load rather than a client-side navigation.
 */
async function endSession() {
    const result = await signOut();
    if (result.status === 'error')
        return result;
    // Personal data first, so it is gone even if a later step throws.
    passengers.clear();
    bookingDraft.reset();
    boarding.reset();
    forgetAssignment();
    trips.reset();
    fleet.reset();
    session.end();
    await discardCachedData();
    return result;
}
/**
 * Empties the Firestore on-disk cache, if it can be done promptly.
 *
 * Both steps can wait forever. `terminate` waits for work already in flight,
 * and `clearIndexedDbPersistence` waits for every other tab to release the
 * shared lease that multi-tab persistence takes out — so a second tab left open
 * on another screen is enough to block it indefinitely.
 *
 * Signing out must never be the thing that hangs. The clear is given a budget
 * and abandoned if it overruns: Auth is already signed out and every in-memory
 * store is already cleared by then, so what is left behind in the worst case is
 * a cache that cannot be read without signing in again.
 */
const CACHE_CLEAR_BUDGET_MS = 1500;
async function discardCachedData() {
    if (!firebaseConfigured || !db)
        return;
    const clear = (async () => {
        try {
            await terminate(db);
            await clearIndexedDbPersistence(db);
        }
        catch {
            // Nothing to surface: the session itself is already ended.
        }
    })();
    await Promise.race([
        clear,
        new Promise((resolve) => setTimeout(resolve, CACHE_CLEAR_BUDGET_MS))
    ]);
}
/**
 * Ends the session and sends the person to their own sign-in screen.
 *
 * The single sign-out implementation in the app. Every control that offers
 * "Sign out" — the traveller profile menu, the mobile sheet, and the workspace
 * bars a conductor, driver, or controller uses — calls this one function, so
 * none of them can drift into clearing less than the others.
 *
 * A full page load rather than `goto`: ending a session terminates Firestore so
 * its cached documents can be dropped, and nothing left running in this page
 * may use it afterwards. On a shared depot device the reload is the point.
 */
export async function signOutAndRedirect(onbefore) {
    const role = session.current?.role ?? null;
    const result = await endSession();
    if (result.status === 'error') {
        toasts.show(m.auth_sign_out_error(), 'warning');
        return;
    }
    onbefore?.();
    window.location.assign(role ? signInPathFor(role) : '/login');
}
