import { listTrips } from './bookings.service';
import { buildLedger, ledgerTotals } from '$utils/ledger';
import type { ServiceResult } from '$types/common';
import type { LedgerEntry } from '$types/booking';

/**
 * Transaction history.
 *
 * Fetches the traveller's own bookings and hands them to the pure projection in
 * `utils/ledger`. Nothing is written by reading this history.
 */

// The page imports its data and totals from one service.
export { ledgerTotals };

/** The traveller's own ledger. Reads bookings; writes nothing. */
export async function listTransactions(): Promise<ServiceResult<LedgerEntry[]>> {
	const result = await listTrips();
	if (result.status === 'error') return result;
	return { status: 'ok', data: buildLedger(result.data) };
}
