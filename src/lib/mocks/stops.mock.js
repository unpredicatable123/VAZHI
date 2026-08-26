/**
 * District and stop fixtures.
 *
 * MOCK DEMONSTRATION LOCATIONS. These are not live government records and no
 * transport corporation register is contacted to produce them. The place names
 * are well-known public landmarks used so the demo has somewhere realistic to
 * travel between; the coordinates are approximate and the accessibility flags
 * are invented for the demo.
 *
 * Public infrastructure only — this file contains no personal data of any kind
 * and must never gain any.
 *
 * The canonical journey defined in the build specification runs from
 * `salem-new-bus-stand` to `chennai-cmbt`. Those two ids, and every other id
 * that existed before districts were introduced, are stable and must not be
 * renamed: they appear in bus fixtures, saved bookings, and URLs.
 */
export const districtFixtures = [
    { id: 'salem', name: 'Salem', nameTa: 'சேலம்' },
    { id: 'chennai', name: 'Chennai', nameTa: 'சென்னை' },
    { id: 'coimbatore', name: 'Coimbatore', nameTa: 'கோயம்புத்தூர்' },
    { id: 'madurai', name: 'Madurai', nameTa: 'மதுரை' },
    { id: 'tiruchirappalli', name: 'Tiruchirappalli', nameTa: 'திருச்சிராப்பள்ளி' },
    { id: 'tirunelveli', name: 'Tirunelveli', nameTa: 'திருநெல்வேலி' },
    { id: 'vellore', name: 'Vellore', nameTa: 'வேலூர்' },
    { id: 'erode', name: 'Erode', nameTa: 'ஈரோடு' },
    { id: 'tiruppur', name: 'Tiruppur', nameTa: 'திருப்பூர்' },
    { id: 'thanjavur', name: 'Thanjavur', nameTa: 'தஞ்சாவூர்' },
    { id: 'dindigul', name: 'Dindigul', nameTa: 'திண்டுக்கல்' },
    { id: 'krishnagiri', name: 'Krishnagiri', nameTa: 'கிருஷ்ணகிரி' },
    { id: 'kanyakumari', name: 'Kanyakumari', nameTa: 'கன்னியாகுமரி' },
    { id: 'villupuram', name: 'Villupuram', nameTa: 'விழுப்புரம்' },
    { id: 'dharmapuri', name: 'Dharmapuri', nameTa: 'தர்மபுரி' },
    // Bengaluru is out of state, but SETC works the Salem corridor across the
    // border, so the terminus has to be selectable for that journey to exist.
    { id: 'bangalore', name: 'Bangalore', nameTa: 'பெங்களூரு' }
];
export const stopFixtures = [
    // --- Salem ---
    {
        id: 'salem-new-bus-stand',
        name: 'Salem New Bus Stand',
        nameTa: 'சேலம் புதிய பேருந்து நிலையம்',
        districtId: 'salem',
        kind: 'bus_stand',
        coordinates: [78.146, 11.6643],
        accessibleBoarding: true
    },
    {
        id: 'salem-old-bus-stand',
        name: 'Salem Old Bus Stand',
        nameTa: 'சேலம் பழைய பேருந்து நிலையம்',
        districtId: 'salem',
        kind: 'bus_stand',
        coordinates: [78.1652, 11.6532],
        accessibleBoarding: false
    },
    {
        id: 'omalur',
        name: 'Omalur Bus Stand',
        nameTa: 'ஓமலூர் பேருந்து நிலையம்',
        districtId: 'salem',
        kind: 'bus_stand',
        coordinates: [77.7539, 11.7409],
        accessibleBoarding: false
    },
    {
        id: 'salem-bypass',
        name: 'Salem Bypass',
        nameTa: 'சேலம் புறவழிச்சாலை',
        districtId: 'salem',
        kind: 'bypass',
        coordinates: [78.1189, 11.6321],
        accessibleBoarding: false
    },
    // --- Chennai ---
    {
        id: 'chennai-cmbt',
        name: 'Chennai CMBT',
        nameTa: 'சென்னை சிஎம்பிடி',
        districtId: 'chennai',
        kind: 'terminal',
        coordinates: [80.2, 13.069],
        accessibleBoarding: true
    },
    {
        id: 'koyambedu',
        name: 'Koyambedu',
        nameTa: 'கோயம்பேடு',
        districtId: 'chennai',
        kind: 'terminal',
        coordinates: [80.1936, 13.0694],
        accessibleBoarding: true
    },
    {
        id: 'chennai-broadway',
        name: 'Broadway Bus Stand',
        nameTa: 'பிராட்வே பேருந்து நிலையம்',
        districtId: 'chennai',
        kind: 'bus_stand',
        coordinates: [80.2874, 13.0925],
        accessibleBoarding: true
    },
    {
        id: 'chennai-tambaram',
        name: 'Tambaram Bus Terminus',
        nameTa: 'தாம்பரம் பேருந்து முனையம்',
        districtId: 'chennai',
        kind: 'terminal',
        coordinates: [80.1198, 12.9249],
        accessibleBoarding: false
    },
    // --- Coimbatore ---
    {
        id: 'coimbatore-gandhipuram',
        name: 'Gandhipuram Bus Stand',
        nameTa: 'காந்திபுரம் பேருந்து நிலையம்',
        districtId: 'coimbatore',
        kind: 'bus_stand',
        coordinates: [76.9639, 11.0183],
        accessibleBoarding: true
    },
    {
        id: 'coimbatore-ukkadam',
        name: 'Ukkadam Bus Terminus',
        nameTa: 'உக்கடம் பேருந்து முனையம்',
        districtId: 'coimbatore',
        kind: 'terminal',
        coordinates: [76.9558, 10.9925],
        accessibleBoarding: true
    },
    {
        id: 'coimbatore-singanallur',
        name: 'Singanallur Bus Stand',
        nameTa: 'சிங்காநல்லூர் பேருந்து நிலையம்',
        districtId: 'coimbatore',
        kind: 'bus_stand',
        coordinates: [77.0289, 10.9973],
        accessibleBoarding: false
    },
    // --- Madurai ---
    {
        id: 'madurai-mattuthavani',
        name: 'Mattuthavani Bus Terminus',
        nameTa: 'மாட்டுத்தாவணி பேருந்து முனையம்',
        districtId: 'madurai',
        kind: 'terminal',
        coordinates: [78.1465, 9.9391],
        accessibleBoarding: true
    },
    {
        id: 'madurai-periyar',
        name: 'Periyar Bus Stand',
        nameTa: 'பெரியார் பேருந்து நிலையம்',
        districtId: 'madurai',
        kind: 'bus_stand',
        coordinates: [78.1198, 9.9182],
        accessibleBoarding: false
    },
    // --- Tiruchirappalli ---
    {
        id: 'trichy-central',
        name: 'Trichy Central Bus Stand',
        nameTa: 'திருச்சி மத்திய பேருந்து நிலையம்',
        districtId: 'tiruchirappalli',
        kind: 'bus_stand',
        coordinates: [78.6869, 10.8155],
        accessibleBoarding: false
    },
    {
        id: 'trichy-chathiram',
        name: 'Chathiram Bus Stand',
        nameTa: 'சத்திரம் பேருந்து நிலையம்',
        districtId: 'tiruchirappalli',
        kind: 'bus_stand',
        coordinates: [78.6944, 10.8305],
        accessibleBoarding: true
    },
    // --- Tirunelveli ---
    {
        id: 'tirunelveli-new-bus-stand',
        name: 'Tirunelveli New Bus Stand',
        nameTa: 'திருநெல்வேலி புதிய பேருந்து நிலையம்',
        districtId: 'tirunelveli',
        kind: 'bus_stand',
        coordinates: [77.7064, 8.7139],
        accessibleBoarding: true
    },
    // --- Vellore ---
    {
        id: 'vellore-new-bus-stand',
        name: 'Vellore New Bus Stand',
        nameTa: 'வேலூர் புதிய பேருந்து நிலையம்',
        districtId: 'vellore',
        kind: 'bus_stand',
        coordinates: [79.1325, 12.9165],
        accessibleBoarding: true
    },
    {
        id: 'vellore-katpadi',
        name: 'Katpadi Junction',
        nameTa: 'காட்பாடி சந்திப்பு',
        districtId: 'vellore',
        kind: 'waypoint',
        coordinates: [79.1378, 12.9698],
        accessibleBoarding: false
    },
    // --- Erode ---
    {
        id: 'erode-central',
        name: 'Erode Central Bus Stand',
        nameTa: 'ஈரோடு மத்திய பேருந்து நிலையம்',
        districtId: 'erode',
        kind: 'bus_stand',
        coordinates: [77.7172, 11.3428],
        accessibleBoarding: true
    },
    // --- Tiruppur ---
    {
        id: 'tiruppur-new-bus-stand',
        name: 'Tiruppur New Bus Stand',
        nameTa: 'திருப்பூர் புதிய பேருந்து நிலையம்',
        districtId: 'tiruppur',
        kind: 'bus_stand',
        coordinates: [77.3411, 11.1085],
        accessibleBoarding: false
    },
    // --- Thanjavur ---
    {
        id: 'thanjavur-new-bus-stand',
        name: 'Thanjavur New Bus Stand',
        nameTa: 'தஞ்சாவூர் புதிய பேருந்து நிலையம்',
        districtId: 'thanjavur',
        kind: 'bus_stand',
        coordinates: [79.1183, 10.7728],
        accessibleBoarding: true
    },
    // --- Dindigul ---
    {
        id: 'dindigul-bus-stand',
        name: 'Dindigul Bus Stand',
        nameTa: 'திண்டுக்கல் பேருந்து நிலையம்',
        districtId: 'dindigul',
        kind: 'bus_stand',
        coordinates: [77.9803, 10.3624],
        accessibleBoarding: false
    },
    // --- Krishnagiri ---
    {
        id: 'krishnagiri-bus-stand',
        name: 'Krishnagiri Bus Stand',
        nameTa: 'கிருஷ்ணகிரி பேருந்து நிலையம்',
        districtId: 'krishnagiri',
        kind: 'bus_stand',
        coordinates: [78.2138, 12.5186],
        accessibleBoarding: false
    },
    {
        id: 'hosur-bus-stand',
        name: 'Hosur Bus Stand',
        nameTa: 'ஓசூர் பேருந்து நிலையம்',
        districtId: 'krishnagiri',
        kind: 'bus_stand',
        coordinates: [77.8253, 12.7409],
        accessibleBoarding: true
    },
    // --- Kanyakumari ---
    {
        id: 'nagercoil-bus-stand',
        name: 'Nagercoil Bus Stand',
        nameTa: 'நாகர்கோவில் பேருந்து நிலையம்',
        districtId: 'kanyakumari',
        kind: 'bus_stand',
        coordinates: [77.4342, 8.1785],
        accessibleBoarding: false
    },
    // --- Villupuram ---
    {
        id: 'villupuram-bus-stand',
        name: 'Villupuram Bus Stand',
        nameTa: 'விழுப்புரம் பேருந்து நிலையம்',
        districtId: 'villupuram',
        kind: 'bus_stand',
        coordinates: [79.488, 11.939],
        accessibleBoarding: false
    },
    // --- Dharmapuri ---
    {
        id: 'dharmapuri-bus-stand',
        name: 'Dharmapuri Bus Stand',
        nameTa: 'தர்மபுரி பேருந்து நிலையம்',
        districtId: 'dharmapuri',
        kind: 'bus_stand',
        coordinates: [78.1583, 12.1211],
        accessibleBoarding: false
    },
    // --- Bangalore ---
    {
        id: 'bangalore-majestic',
        name: 'Bangalore Majestic',
        nameTa: 'பெங்களூரு மெஜஸ்டிக்',
        districtId: 'bangalore',
        kind: 'terminal',
        coordinates: [77.5726, 12.9776],
        accessibleBoarding: true
    }
];
