import { isKnownStopId } from '$services/stops.service';
import type { IsoDate } from '$types/common';
import type { JourneySearchCriteria } from '$types/transit';
import { todayIso } from '$utils/format';

export const MIN_PASSENGERS = 1;
export const MAX_PASSENGERS = 6;

/**
 * Journey search criteria for the current session.
 *
 * Route, date, and a passenger *count* only. No passenger identity is held
 * here, and nothing from this store is ever written to storage.
 */
class SearchStore {
	originStopId = $state('salem-new-bus-stand');
	destinationStopId = $state('chennai-cmbt');
	date = $state<IsoDate>(todayIso());
	passengers = $state(1);

	get criteria(): Omit<JourneySearchCriteria, 'accessibleTravelMode'> {
		return {
			originStopId: this.originStopId,
			destinationStopId: this.destinationStopId,
			date: this.date,
			passengers: this.passengers
		};
	}

	swap(): void {
		const previousOrigin = this.originStopId;
		this.originStopId = this.destinationStopId;
		this.destinationStopId = previousOrigin;
	}

	setPassengers(count: number): void {
		this.passengers = Math.min(MAX_PASSENGERS, Math.max(MIN_PASSENGERS, Math.round(count)));
	}

	/** Restores the criteria a URL describes. Only non-identifying route data is
	 *  ever encoded in a URL. */
	hydrateFromParams(params: URLSearchParams): void {
		const from = params.get('from');
		const to = params.get('to');
		const date = params.get('date');
		const pax = Number(params.get('pax'));

		// Only ids we actually serve are accepted. A stale bookmark or a
		// hand-edited link would otherwise leave the form pointing at a stop
		// that does not exist, and the search would silently return nothing.
		if (isKnownStopId(from)) this.originStopId = from as string;
		if (isKnownStopId(to)) this.destinationStopId = to as string;
		if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) this.date = date;
		if (Number.isFinite(pax) && pax > 0) this.setPassengers(pax);
	}

	toParams(): URLSearchParams {
		return new URLSearchParams({
			from: this.originStopId,
			to: this.destinationStopId,
			date: this.date,
			pax: String(this.passengers)
		});
	}
}

export const journeySearch = new SearchStore();
