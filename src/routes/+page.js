import { listDistricts, listStops } from '$services/stops.service';
export const load = async () => {
    const [stopsResult, districtsResult] = await Promise.all([listStops(), listDistricts()]);
    return {
        stops: stopsResult.status === 'ok' ? stopsResult.data : [],
        districts: districtsResult.status === 'ok' ? districtsResult.data : []
    };
};
