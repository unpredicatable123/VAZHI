import { listDistricts, listStops } from '$services/stops.service';
import type { District, TransitStop } from '$types/transit';
import type { PageLoad } from './$types';

export const load: PageLoad = async (): Promise<{
	stops: TransitStop[];
	districts: District[];
}> => {
	const [stopsResult, districtsResult] = await Promise.all([listStops(), listDistricts()]);
	return {
		stops: stopsResult.status === 'ok' ? stopsResult.data : [],
		districts: districtsResult.status === 'ok' ? districtsResult.data : []
	};
};
