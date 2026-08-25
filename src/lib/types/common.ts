/** Shared primitives used across the VAZHI domain. */

/** ISO-8601 calendar date, `YYYY-MM-DD`. */
export type IsoDate = string;

/** 24-hour clock time, `HH:mm`. */
export type ClockTime = string;

/** A whole number of Indian paise. Fares are stored in paise so that no
 *  currency arithmetic ever runs against a float. */
export type Paise = number;

/** Result envelope returned by every service call so pages can render
 *  loading / empty / error states without try-catch noise. */
export type ServiceResult<T> =
	| { status: 'ok'; data: T }
	| { status: 'error'; error: ServiceError };

export interface ServiceError {
	code:
		| 'network'
		| 'not_found'
		| 'invalid_request'
		| 'unauthenticated'
		| 'permission_denied'
		| 'failed_precondition'
		| 'already_exists'
		| 'unknown';
	/** Message key resolved through Paraglide by the caller, never raw text. */
	messageKey: string;
}

export type AsyncState = 'idle' | 'loading' | 'ready' | 'empty' | 'error';
