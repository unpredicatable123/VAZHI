import { fleet } from '$stores/fleet.svelte';
import { simulateLatency } from './transport';
import { collection, doc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '$lib/firebase/client';
import { mapFirebaseError } from '$lib/firebase/errors';
/**
 * Crew lookup.
 *
 * Backed by fixtures today; the signatures are the boundary a real crew API
 * will slot into without touching a caller.
 *
 * PRIVACY: everything this module can return is a duty ID, a roster name, a
 * depot, and a duty status, because `CrewMember` has no other field. There is
 * no call here that could hand a caller a contact detail or an identity
 * document, and none may be added.
 */
export async function listCrew(role) {
    try {
        const { db } = requireFirebase();
        const snapshot = await getDocs(collection(db, 'crew'));
        const roster = snapshot.docs
            .map((entry) => ({ id: entry.id, ...entry.data() }))
            .filter((member) => member.retired !== true);
        roster.forEach((member) => fleet.saveCrew(member));
        return { status: 'ok', data: role ? roster.filter((member) => member.role === role) : roster };
    }
    catch (error) {
        return { status: 'error', error: mapFirebaseError(error, 'ops_crew_error_title') };
    }
}
/**
 * Resolves a duty ID, accepting the aliases earlier builds issued.
 *
 * A stored session or a bookmark from before crew records existed still names
 * a real crew member this way, so nobody is locked out by the rename.
 */
export function findCrew(id) {
    const needle = id.trim().toLocaleUpperCase();
    return fleet.crew.find((member) => member.id.toLocaleUpperCase() === needle ||
        member.aliases.some((alias) => alias.toLocaleUpperCase() === needle));
}
/** Resolves a duty ID and checks it belongs to the expected crew role. */
export function findCrewInRole(id, role) {
    const member = findCrew(id);
    return member?.role === role ? member : undefined;
}
/** Drivers, then conductors, each in roster order. Synchronous for renders. */
export function crewInRole(role) {
    return fleet.crew.filter((member) => member.role === role);
}
/**
 * Filters a roster by name or duty ID.
 *
 * Matches either, because a controller has both to hand: a radio call gives a
 * duty ID, a depot sheet gives a name. Earlier identifiers are matched too, so
 * someone searching `COND001` still finds `CON-023`.
 *
 * Pure and synchronous, so the table can filter on every keystroke without a
 * round trip.
 */
export function searchCrew(crew, query) {
    const needle = query.trim().toLocaleLowerCase();
    if (needle === '')
        return crew;
    return crew.filter((member) => {
        if (member.id.toLocaleLowerCase().includes(needle))
            return true;
        if (member.name.toLocaleLowerCase().includes(needle))
            return true;
        if (member.depot.toLocaleLowerCase().includes(needle))
            return true;
        return member.aliases.some((alias) => alias.toLocaleLowerCase().includes(needle));
    });
}
/** Duty IDs look like `DRV-014` or `CON-023`. */
const DUTY_ID_PATTERN = /^(DRV|CON)-\d{3}$/;
function validateCrew(draft) {
    const issues = [];
    if (draft.name.trim() === '') {
        issues.push({ field: 'name', messageKey: 'ops_crew_error_name' });
    }
    if (draft.depot.trim() === '') {
        issues.push({ field: 'depot', messageKey: 'ops_crew_error_depot' });
    }
    if (draft.createAccount && (draft.initialPassword?.length ?? 0) < 8) {
        issues.push({ field: 'password', messageKey: 'ops_crew_error_password' });
    }
    if (draft.createAccount && draft.initialPassword !== draft.confirmPassword) {
        issues.push({ field: 'confirmPassword', messageKey: 'ops_crew_error_password_confirm' });
    }
    if (draft.id !== undefined) {
        const id = draft.id.trim().toLocaleUpperCase();
        const expectedPrefix = draft.role === 'driver' ? 'DRV-' : 'CON-';
        if (!DUTY_ID_PATTERN.test(id) || !id.startsWith(expectedPrefix)) {
            issues.push({ field: 'id', messageKey: 'ops_crew_error_id_format' });
        }
        else {
            // A duty ID is how a trip names its crew and how they sign in, so two
            // people cannot share one. A record matching itself is not a clash.
            const clash = findCrew(id);
            if (clash && clash.id !== draft.editingId) {
                issues.push({ field: 'id', messageKey: 'ops_crew_error_id_taken' });
            }
        }
    }
    return issues;
}
/**
 * The next free duty ID for a role.
 *
 * Numbered rather than random so a roster reads in order, and so a controller
 * adding two people in a row gets consecutive IDs rather than two surprises.
 */
export function nextCrewId(role) {
    const prefix = role === 'driver' ? 'DRV' : 'CON';
    const used = new Set(fleet.crew.map((member) => member.id.toLocaleUpperCase()));
    for (let n = 1; n < 1000; n++) {
        const candidate = `${prefix}-${String(n).padStart(3, '0')}`;
        if (!used.has(candidate))
            return candidate;
    }
    return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}
export async function saveCrew(draft) {
    await simulateLatency(240);
    const issues = validateCrew(draft);
    if (issues.length > 0) {
        return {
            status: 'error',
            error: { code: 'invalid_request', messageKey: 'ops_crew_error_title' },
            issues
        };
    }
    const existing = draft.editingId ? findCrew(draft.editingId) : undefined;
    const member = {
        id: draft.id?.trim().toLocaleUpperCase() || nextCrewId(draft.role),
        role: draft.role,
        name: draft.name.trim(),
        depot: draft.depot.trim(),
        status: draft.status,
        // Past identifiers are carried forward, so an older session or bookmark
        // still resolves to the same person after an edit.
        aliases: existing ? [...existing.aliases] : []
    };
    /*
        A renamed duty ID keeps the old one as an alias and retires the old
        record, so trips and sessions that still name it resolve to the same
        person rather than to nobody.
    */
    if (existing && existing.id !== member.id) {
        member.aliases = [...new Set([...member.aliases, existing.id])];
        fleet.retireCrew(existing.id);
    }
    try {
        const { db, functions } = requireFirebase();
        if (draft.createAccount) {
            if (existing) {
                return {
                    status: 'error',
                    error: { code: 'invalid_request', messageKey: 'ops_crew_account_new_only' }
                };
            }
            const created = await httpsCallable(functions, 'createCrewWithAccount')({
                member,
                initialPassword: draft.initialPassword ?? ''
            });
            fleet.saveCrew(created.data.member);
            return {
                status: 'ok',
                data: created.data.member,
                credentials: {
                    ...created.data.credentials,
                    initialPassword: draft.initialPassword ?? ''
                }
            };
        }
        if (existing && existing.id !== member.id) {
            await updateDoc(doc(db, 'crew', existing.id), { retired: true, updatedAt: serverTimestamp() });
        }
        await setDoc(doc(db, 'crew', member.id), { ...member, updatedAt: serverTimestamp() });
        fleet.saveCrew(member);
        return { status: 'ok', data: member };
    }
    catch (error) {
        return { status: 'error', error: mapFirebaseError(error, 'ops_crew_error_title') };
    }
}
/**
 * The trips a crew member is still rostered onto.
 *
 * Takes the trips rather than fetching them: `trips.service` already depends on
 * this module to resolve a crew member, so reaching back would make the two
 * import each other.
 */
function crewCommitments(crewId, trips) {
    const needle = crewId.toLocaleUpperCase();
    return trips.filter((trip) => trip.status !== 'cancelled' &&
        (trip.driverId.toLocaleUpperCase() === needle ||
            trip.conductorId.toLocaleUpperCase() === needle));
}
export async function deleteCrew(crewId, trips) {
    await simulateLatency(200);
    if (!findCrew(crewId)) {
        return { status: 'error', error: { code: 'not_found', messageKey: 'crew_missing_body' } };
    }
    // Someone rostered onto a running cannot simply vanish: the trip would name
    // a crew member who no longer exists, and the driver or conductor screens
    // would have nothing to show at sign-in.
    const blockedBy = crewCommitments(crewId, trips);
    if (blockedBy.length > 0) {
        return {
            status: 'error',
            error: { code: 'invalid_request', messageKey: 'ops_crew_error_in_use' },
            blockedBy
        };
    }
    try {
        const { db } = requireFirebase();
        await updateDoc(doc(db, 'crew', crewId), { retired: true, updatedAt: serverTimestamp() });
        fleet.retireCrew(crewId);
        return { status: 'ok', data: null };
    }
    catch (error) {
        return { status: 'error', error: mapFirebaseError(error, 'ops_crew_error_title') };
    }
}
