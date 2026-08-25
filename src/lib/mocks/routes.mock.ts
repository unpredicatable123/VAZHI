import type { TransitRoute } from '$types/fleet';

/**
 * Route fixtures — corridors, in running order.
 *
 * MOCK DEMONSTRATION ROUTES. The place names are well-known public landmarks
 * so the demo has somewhere realistic to travel between; the running orders and
 * distances are approximate and no government timetable is consulted.
 *
 * ARCHITECTURE: a route is a corridor and nothing more. It has no vehicle, no
 * date, no departure time, and no crew — those belong to a trip. The same
 * corridor is therefore run by different buses on different days.
 *
 * `salem-chennai` keeps its id, because it is already the key for the bundled
 * map geometry in `static/geo` and appears in saved bookings.
 *
 * Public infrastructure only: no personal data here, ever.
 */

/**
 * Intermediate stop ids on `salem-chennai` match the bundled geometry in
 * `static/geo/salem-chennai.json`, so the map and the stop list agree. They are
 * timing points rather than bookable stands, so most have no `TransitStop`
 * record — which is exactly why `RouteStop` carries its own names.
 */
export const routeFixtures: TransitRoute[] = [
	{
		id: 'salem-chennai',
		name: 'Salem → Chennai',
		nameTa: 'சேலம் → சென்னை',
		distanceKm: 350,
		geometryId: 'salem-chennai',
		stops: [
			{
				stopId: 'salem-new-bus-stand',
				name: 'Salem New Bus Stand',
				nameTa: 'சேலம் புதிய பேருந்து நிலையம்',
				role: 'origin',
				coordinates: [78.146, 11.6643]
			},
			{ stopId: 'attur', name: 'Attur', nameTa: 'ஆத்தூர்', role: 'intermediate', coordinates: [78.601, 11.594] },
			{
				stopId: 'kallakurichi',
				name: 'Kallakurichi',
				nameTa: 'கள்ளக்குறிச்சி',
				role: 'intermediate',
				coordinates: [78.959, 11.738]
			},
			{ stopId: 'ulundurpet', name: 'Ulundurpet', nameTa: 'உளுந்தூர்பேட்டை', role: 'intermediate', coordinates: [79.316, 11.669] },
			{ stopId: 'villupuram', name: 'Villupuram', nameTa: 'விழுப்புரம்', role: 'intermediate', coordinates: [79.488, 11.939] },
			{ stopId: 'tindivanam', name: 'Tindivanam', nameTa: 'திண்டிவனம்', role: 'intermediate', coordinates: [79.653, 12.235] },
			{ stopId: 'chengalpattu', name: 'Chengalpattu', nameTa: 'செங்கல்பட்டு', role: 'intermediate', coordinates: [79.976, 12.692] },
			{
				stopId: 'chennai-cmbt',
				name: 'Chennai CMBT',
				nameTa: 'சென்னை CMBT',
				role: 'destination',
				coordinates: [80.2, 13.069]
			}
		]
	},
	{
		id: 'salem-bangalore',
		name: 'Salem → Bangalore',
		nameTa: 'சேலம் → பெங்களூரு',
		distanceKm: 205,
		stops: [
			{
				stopId: 'salem-new-bus-stand',
				name: 'Salem New Bus Stand',
				nameTa: 'சேலம் புதிய பேருந்து நிலையம்',
				role: 'origin',
				coordinates: [78.146, 11.6643]
			},
			{ stopId: 'omalur', name: 'Omalur', nameTa: 'ஓமலூர்', role: 'intermediate', coordinates: [77.7539, 11.7409] },
			{
				stopId: 'dharmapuri-bus-stand',
				name: 'Dharmapuri',
				nameTa: 'தர்மபுரி',
				role: 'intermediate',
				coordinates: [78.1583, 12.1211]
			},
			{
				stopId: 'krishnagiri-bus-stand',
				name: 'Krishnagiri',
				nameTa: 'கிருஷ்ணகிரி',
				role: 'intermediate',
				coordinates: [78.2138, 12.5186]
			},
			{ stopId: 'hosur-bus-stand', name: 'Hosur', nameTa: 'ஓசூர்', role: 'intermediate', coordinates: [77.8253, 12.7409] },
			{
				stopId: 'bangalore-majestic',
				name: 'Bangalore Majestic',
				nameTa: 'பெங்களூரு மெஜஸ்டிக்',
				role: 'destination',
				coordinates: [77.5726, 12.9776]
			}
		]
	},
	{
		id: 'coimbatore-chennai',
		name: 'Coimbatore → Chennai',
		nameTa: 'கோயம்புத்தூர் → சென்னை',
		distanceKm: 505,
		stops: [
			{
				stopId: 'coimbatore-gandhipuram',
				name: 'Coimbatore Gandhipuram',
				nameTa: 'கோயம்புத்தூர் காந்திபுரம்',
				role: 'origin',
				coordinates: [76.9639, 11.0183]
			},
			{ stopId: 'erode-central', name: 'Erode', nameTa: 'ஈரோடு', role: 'intermediate', coordinates: [77.7172, 11.3428] },
			{
				stopId: 'salem-new-bus-stand',
				name: 'Salem New Bus Stand',
				nameTa: 'சேலம் புதிய பேருந்து நிலையம்',
				role: 'intermediate',
				coordinates: [78.146, 11.6643]
			},
			{ stopId: 'ulundurpet', name: 'Ulundurpet', nameTa: 'உளுந்தூர்பேட்டை', role: 'intermediate', coordinates: [79.316, 11.669] },
			{
				stopId: 'chennai-cmbt',
				name: 'Chennai CMBT',
				nameTa: 'சென்னை CMBT',
				role: 'destination',
				coordinates: [80.2, 13.069]
			}
		]
	},
	{
		id: 'madurai-chennai',
		name: 'Madurai → Chennai',
		nameTa: 'மதுரை → சென்னை',
		distanceKm: 460,
		stops: [
			{
				stopId: 'madurai-mattuthavani',
				name: 'Madurai Mattuthavani',
				nameTa: 'மதுரை மாட்டுத்தாவணி',
				role: 'origin',
				coordinates: [78.1465, 9.9391]
			},
			{ stopId: 'trichy-central', name: 'Tiruchirappalli', nameTa: 'திருச்சிராப்பள்ளி', role: 'intermediate', coordinates: [78.6869, 10.8155] },
			{ stopId: 'ulundurpet', name: 'Ulundurpet', nameTa: 'உளுந்தூர்பேட்டை', role: 'intermediate', coordinates: [79.316, 11.669] },
			{ stopId: 'tindivanam', name: 'Tindivanam', nameTa: 'திண்டிவனம்', role: 'intermediate', coordinates: [79.653, 12.235] },
			{
				stopId: 'chennai-cmbt',
				name: 'Chennai CMBT',
				nameTa: 'சென்னை CMBT',
				role: 'destination',
				coordinates: [80.2, 13.069]
			}
		]
	},
	{
		id: 'bangalore-chennai',
		name: 'Bangalore → Chennai',
		nameTa: 'பெங்களூரு → சென்னை',
		distanceKm: 345,
		stops: [
			{
				stopId: 'bangalore-majestic',
				name: 'Bangalore Majestic',
				nameTa: 'பெங்களூரு மெஜஸ்டிக்',
				role: 'origin',
				coordinates: [77.5726, 12.9776]
			},
			{ stopId: 'hosur-bus-stand', name: 'Hosur', nameTa: 'ஓசூர்', role: 'intermediate', coordinates: [77.8253, 12.7409] },
			{ stopId: 'krishnagiri-bus-stand', name: 'Krishnagiri', nameTa: 'கிருஷ்ணகிரி', role: 'intermediate', coordinates: [78.2138, 12.5186] },
			{ stopId: 'vellore-new-bus-stand', name: 'Vellore', nameTa: 'வேலூர்', role: 'intermediate', coordinates: [79.1325, 12.9165] },
			{
				stopId: 'chennai-cmbt',
				name: 'Chennai CMBT',
				nameTa: 'சென்னை CMBT',
				role: 'destination',
				coordinates: [80.2, 13.069]
			}
		]
	},
	{
		id: 'trichy-chennai',
		name: 'Tiruchirappalli → Chennai',
		nameTa: 'திருச்சிராப்பள்ளி → சென்னை',
		distanceKm: 330,
		stops: [
			{
				stopId: 'trichy-central',
				name: 'Tiruchirappalli Central Bus Stand',
				nameTa: 'திருச்சிராப்பள்ளி மத்திய பேருந்து நிலையம்',
				role: 'origin',
				coordinates: [78.6869, 10.8155]
			},
			{ stopId: 'perambalur', name: 'Perambalur', nameTa: 'பெரம்பலூர்', role: 'intermediate', coordinates: [78.8807, 11.2322] },
			{ stopId: 'ulundurpet', name: 'Ulundurpet', nameTa: 'உளுந்தூர்பேட்டை', role: 'intermediate', coordinates: [79.316, 11.669] },
			{ stopId: 'villupuram', name: 'Villupuram', nameTa: 'விழுப்புரம்', role: 'intermediate', coordinates: [79.488, 11.939] },
			{
				stopId: 'chennai-cmbt',
				name: 'Chennai CMBT',
				nameTa: 'சென்னை CMBT',
				role: 'destination',
				coordinates: [80.2, 13.069]
			}
		]
	}
];
