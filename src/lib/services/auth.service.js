import { createUserWithEmailAndPassword, deleteUser, EmailAuthProvider, onAuthStateChanged, reauthenticateWithCredential, signInWithEmailAndPassword, signOut as firebaseSignOut, updatePassword, updateProfile } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { httpsCallable } from 'firebase/functions';
import { auth, firebaseConfigured, requireFirebase } from '$lib/firebase/client';
import { mapFirebaseError } from '$lib/firebase/errors';
import { userRoles } from '$types/auth';
const DRIVER_ID_PATTERN = /^TN-DVR-\d{4}$/;
export function normaliseDriverId(value) {
    return value.trim().toLocaleUpperCase('en');
}
export function requiresDutyId(role) {
    return role === 'conductor' || role === 'driver';
}
function firebaseIdentifier(identifier, role) {
    const value = identifier.trim().toLocaleLowerCase('en');
    if (value.includes('@'))
        return value;
    if (role === 'traveller' && /^\+?\d{10,15}$/.test(value)) {
        return `${value.replace(/^\+/, '')}@phone.vazhi.app`;
    }
    const scope = role === 'operations' ? 'operations' : 'crew';
    return `${value.replace(/[^a-z0-9-]/g, '')}@${scope}.vazhi.app`;
}
async function sessionFromUser(user, forceRefresh = false) {
    const token = await user.getIdTokenResult(forceRefresh);
    const role = token.claims.role;
    if (typeof role !== 'string' || !userRoles.includes(role))
        return null;
    const dutyId = typeof token.claims.dutyId === 'string' ? token.claims.dutyId : undefined;
    return {
        role: role,
        id: dutyId ?? user.uid,
        displayName: user.displayName?.trim() || dutyId || 'VAZHI user'
    };
}
export function observeSession(callback) {
    if (!firebaseConfigured || !auth) {
        callback(null);
        return () => undefined;
    }
    return onAuthStateChanged(auth, async (user) => {
        try {
            callback(user ? await sessionFromUser(user) : null);
        }
        catch {
            callback(null);
        }
    });
}
export async function signIn(role, credentials) {
    const identifier = credentials.identifier.trim();
    if (!identifier || !credentials.password) {
        return { status: 'error', error: { code: 'invalid_request', messageKey: 'auth_error_missing_fields' } };
    }
    const badgeId = normaliseDriverId(credentials.driverId ?? '');
    if (requiresDutyId(role)) {
        if (!badgeId) {
            return { status: 'error', error: { code: 'invalid_request', messageKey: 'auth_error_driver_id_required' } };
        }
        if (!DRIVER_ID_PATTERN.test(badgeId)) {
            return { status: 'error', error: { code: 'invalid_request', messageKey: 'auth_error_driver_id_format' } };
        }
    }
    try {
        const sdk = requireFirebase();
        const credential = await signInWithEmailAndPassword(sdk.auth, firebaseIdentifier(identifier, role), credentials.password);
        const resolved = await sessionFromUser(credential.user, true);
        if (!resolved || resolved.role !== role)
            throw new Error('auth/role-mismatch');
        if (requiresDutyId(role)) {
            await httpsCallable(sdk.functions, 'verifyDutyIdentity')({ badgeId });
        }
        return { status: 'ok', data: resolved };
    }
    catch (error) {
        if (auth?.currentUser)
            await firebaseSignOut(auth).catch(() => undefined);
        return { status: 'error', error: mapFirebaseError(error, 'auth_error_invalid') };
    }
}
export async function registerTraveller(registration) {
    const displayName = registration.displayName.trim();
    const email = registration.email.trim().toLocaleLowerCase('en');
    if (displayName.length < 2 || displayName.length > 60 || !/^\S+@\S+\.\S+$/.test(email)) {
        return {
            status: 'error',
            error: { code: 'invalid_request', messageKey: 'auth_register_error_details' }
        };
    }
    if (registration.password.length < 8) {
        return {
            status: 'error',
            error: { code: 'invalid_request', messageKey: 'auth_register_error_password' }
        };
    }
    let createdUser = null;
    let roleAssigned = false;
    try {
        const sdk = requireFirebase();
        const credential = await createUserWithEmailAndPassword(sdk.auth, email, registration.password);
        createdUser = credential.user;
        await updateProfile(createdUser, { displayName });
        await httpsCallable(sdk.functions, 'registerTraveller')({ displayName });
        roleAssigned = true;
        const resolved = await sessionFromUser(createdUser, true);
        if (!resolved || resolved.role !== 'traveller')
            throw new Error('auth/role-mismatch');
        return { status: 'ok', data: resolved };
    }
    catch (error) {
        if (createdUser && !roleAssigned)
            await deleteUser(createdUser).catch(() => undefined);
        if (auth?.currentUser)
            await firebaseSignOut(auth).catch(() => undefined);
        if (error instanceof FirebaseError) {
            if (error.code === 'auth/email-already-in-use') {
                return {
                    status: 'error',
                    error: { code: 'already_exists', messageKey: 'auth_register_error_email_taken' }
                };
            }
            if (error.code === 'auth/invalid-email') {
                return {
                    status: 'error',
                    error: { code: 'invalid_request', messageKey: 'auth_register_error_details' }
                };
            }
            if (error.code === 'auth/weak-password') {
                return {
                    status: 'error',
                    error: { code: 'invalid_request', messageKey: 'auth_register_error_password' }
                };
            }
        }
        return { status: 'error', error: mapFirebaseError(error, 'auth_register_error_generic') };
    }
}
export async function changeCurrentUserPassword(passwords) {
    if (!passwords.currentPassword || passwords.newPassword.length < 8) {
        return {
            status: 'error',
            error: { code: 'invalid_request', messageKey: 'auth_password_error_details' }
        };
    }
    try {
        const sdk = requireFirebase();
        const user = sdk.auth.currentUser;
        if (!user?.email) {
            return {
                status: 'error',
                error: { code: 'unauthenticated', messageKey: 'auth_password_error_sign_in' }
            };
        }
        await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, passwords.currentPassword));
        await updatePassword(user, passwords.newPassword);
        return { status: 'ok', data: null };
    }
    catch (error) {
        if (error instanceof FirebaseError) {
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
                return {
                    status: 'error',
                    error: { code: 'invalid_request', messageKey: 'auth_password_error_current' }
                };
            }
            if (error.code === 'auth/weak-password') {
                return {
                    status: 'error',
                    error: { code: 'invalid_request', messageKey: 'auth_password_error_new' }
                };
            }
        }
        return { status: 'error', error: mapFirebaseError(error, 'auth_password_error_generic') };
    }
}
export async function signOut() {
    try {
        if (firebaseConfigured && auth)
            await firebaseSignOut(auth);
        return { status: 'ok', data: null };
    }
    catch (error) {
        return { status: 'error', error: mapFirebaseError(error, 'auth_error_invalid') };
    }
}
