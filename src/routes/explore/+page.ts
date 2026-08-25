import { searchBuses } from '$services/search.service';
import { listDistricts, listStops } from '$services/stops.service';
import type {
	BusResult,
	District,
	JourneySearchCriteria,
	TransitStop
} from '$types/transit';
import { todayIso } from '$utils/format';
import type { PageLoad } from './$types';

/**
 * Seeds the Explorer with the canonical Salem → Chennai results so the
 * prerendered page carries real content rather than an empty shell.
 *
 * Search parameters are deliberately not read here: this route is prerendered,
 * so the criteria in the URL are resolved on the client, which refreshes the
 * list if they differ from this seed.
 */
export const load: PageLoad = async (): Promise<{
	stops: TransitStop[];
	districts: District[];
	initialResults: BusResult[];
	initialCriteria: JourneySearchCriteria;
}> => {
	const criteria: JourneySearchCriteria = {
		originStopId: 'salem-new-bus-stand',
		destinationStopId: 'chennai-cmbt',
		date: todayIso(),
		passengers: 1,
		accessibleTravelMode: false
	};

	const [stopsResult, districtsResult, searchResult] = await Promise.all([
		listStops(),
		listDistricts(),
		searchBuses(criteria)
	]);

	return {
		stops: stopsResult.status === 'ok' ? stopsResult.data : [],
		districts: districtsResult.status === 'ok' ? districtsResult.data : [],
		initialResults: searchResult.status === 'ok' ? searchResult.data.results : [],
		initialCriteria: criteria
	};
};
