/**
 * The Tamil Nadu intercity road network.
 *
 * GENERATED from `static/geo/tn-network.json`, the same graph the network map
 * already draws, so the router and the map can never disagree about which towns
 * are actually connected by road.
 *
 * WHY IT EXISTS. Two stops with no corridor between them used to be joined by a
 * single straight line drawn across the state. Routing across this graph instead
 * sends a journey through the towns the road actually passes — Tiruppur to Salem
 * goes via Erode, because that is the road — so the drawn line bends where the
 * road bends.
 *
 * MOCK DATA. The towns are real and the connections follow the real trunk
 * network, but the coordinates are town centroids rather than surveyed
 * carriageway geometry. A line built from this graph approximates the corridor;
 * it does not trace the road. Tracing it properly needs real road geometry,
 * which this build deliberately does not fetch from anywhere.
 *
 * Public infrastructure only. No personal data here, ever.
 */
/** Towns the intercity network passes through. */
export const networkNodes = [
    { id: 'chennai', name: 'Chennai', nameTa: 'சென்னை', coordinates: [80.2707, 13.0827] },
    { id: 'vellore', name: 'Vellore', nameTa: 'வேலூர்', coordinates: [79.1325, 12.9165] },
    { id: 'krishnagiri', name: 'Krishnagiri', nameTa: 'கிருஷ்ணகிரி', coordinates: [78.22, 12.5186] },
    { id: 'salem', name: 'Salem', nameTa: 'சேலம்', coordinates: [78.146, 11.6643] },
    { id: 'erode', name: 'Erode', nameTa: 'ஈரோடு', coordinates: [77.7172, 11.341] },
    { id: 'coimbatore', name: 'Coimbatore', nameTa: 'கோயம்புத்தூர்', coordinates: [76.9558, 11.0168] },
    { id: 'tiruppur', name: 'Tiruppur', nameTa: 'திருப்பூர்', coordinates: [77.3411, 11.1085] },
    { id: 'dindigul', name: 'Dindigul', nameTa: 'திண்டுக்கல்', coordinates: [77.9803, 10.3673] },
    { id: 'madurai', name: 'Madurai', nameTa: 'மதுரை', coordinates: [78.1198, 9.9252] },
    { id: 'trichy', name: 'Tiruchirappalli', nameTa: 'திருச்சிராப்பள்ளி', coordinates: [78.7047, 10.7905] },
    { id: 'thanjavur', name: 'Thanjavur', nameTa: 'தஞ்சாவூர்', coordinates: [79.1378, 10.787] },
    { id: 'villupuram', name: 'Villupuram', nameTa: 'விழுப்புரம்', coordinates: [79.488, 11.939] },
    { id: 'cuddalore', name: 'Cuddalore', nameTa: 'கடலூர்', coordinates: [79.7714, 11.748] },
    { id: 'puducherry', name: 'Puducherry', nameTa: 'புதுச்சேரி', coordinates: [79.8083, 11.9416] },
    { id: 'nagapattinam', name: 'Nagapattinam', nameTa: 'நாகப்பட்டினம்', coordinates: [79.8449, 10.766] },
    { id: 'karaikudi', name: 'Karaikudi', nameTa: 'காரைக்குடி', coordinates: [78.78, 10.073] },
    { id: 'sivaganga', name: 'Sivaganga', nameTa: 'சிவகங்கை', coordinates: [78.483, 9.847] },
    { id: 'ramanathapuram', name: 'Ramanathapuram', nameTa: 'இராமநாதபுரம்', coordinates: [78.83, 9.3639] },
    { id: 'virudhunagar', name: 'Virudhunagar', nameTa: 'விருதுநகர்', coordinates: [77.9578, 9.568] },
    { id: 'tirunelveli', name: 'Tirunelveli', nameTa: 'திருநெல்வேலி', coordinates: [77.7567, 8.7139] },
    { id: 'thoothukudi', name: 'Thoothukudi', nameTa: 'தூத்துக்குடி', coordinates: [78.1348, 8.7642] },
    { id: 'nagercoil', name: 'Nagercoil', nameTa: 'நாகர்கோவில்', coordinates: [77.4119, 8.1833] },
    { id: 'kanyakumari', name: 'Kanyakumari', nameTa: 'கன்னியாகுமரி', coordinates: [77.5385, 8.0883] },
    { id: 'theni', name: 'Theni', nameTa: 'தேனி', coordinates: [77.477, 10.0104] },
    { id: 'hosur', name: 'Hosur', nameTa: 'ஓசூர்', coordinates: [77.8253, 12.7409] },
    { id: 'tiruvannamalai', name: 'Tiruvannamalai', nameTa: 'திருவண்ணாமலை', coordinates: [79.0747, 12.2253] },
    { id: 'kumbakonam', name: 'Kumbakonam', nameTa: 'கும்பகோணம்', coordinates: [79.391, 10.9617] }
];
/** Undirected road links between those towns. */
export const networkEdges = [
    ['salem', 'chennai'],
    ['salem', 'erode'],
    ['erode', 'coimbatore'],
    ['coimbatore', 'tiruppur'],
    ['tiruppur', 'erode'],
    ['salem', 'krishnagiri'],
    ['krishnagiri', 'hosur'],
    ['krishnagiri', 'vellore'],
    ['vellore', 'chennai'],
    ['salem', 'trichy'],
    ['trichy', 'dindigul'],
    ['dindigul', 'madurai'],
    ['madurai', 'virudhunagar'],
    ['virudhunagar', 'tirunelveli'],
    ['tirunelveli', 'thoothukudi'],
    ['tirunelveli', 'nagercoil'],
    ['nagercoil', 'kanyakumari'],
    ['dindigul', 'theni'],
    ['trichy', 'thanjavur'],
    ['thanjavur', 'kumbakonam'],
    ['kumbakonam', 'nagapattinam'],
    ['trichy', 'karaikudi'],
    ['karaikudi', 'sivaganga'],
    ['sivaganga', 'ramanathapuram'],
    ['chennai', 'villupuram'],
    ['villupuram', 'tiruvannamalai'],
    ['tiruvannamalai', 'vellore'],
    ['villupuram', 'cuddalore'],
    ['cuddalore', 'puducherry'],
    ['cuddalore', 'nagapattinam'],
    ['salem', 'villupuram'],
    ['coimbatore', 'dindigul'],
    ['madurai', 'trichy'],
    ['erode', 'trichy'],
    ['chennai', 'puducherry'],
    ['trichy', 'villupuram']
];
