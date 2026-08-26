/**
 * Payani's answer matcher.
 *
 * NO MODEL, NO NETWORK, NO KEY. Payani answers from a fixed set of written
 * answers, chosen by matching what the traveller typed against a keyword list
 * per topic. That is a deliberate choice, not a limitation: a fixed answer set
 * cannot invent a fare, a schedule, or a booking status, which is exactly the
 * guarantee this assistant needs. It also costs nothing, works offline, and
 * answers instantly.
 *
 * HOW MATCHING WORKS. Each topic carries keywords in three registers, because
 * that is how people actually type in Tamil Nadu: English ("cancel"), Tamil
 * script ("ரத்து"), and romanised Tanglish ("rathu", "panradhu"). A question is
 * normalised, then scored against every topic; the best score wins if it clears
 * a floor, otherwise Payani says it does not know rather than guessing.
 *
 * Longer keywords score higher than short ones, so "seat" in "how do I select a
 * seat" does not outrank "cancel my seat booking" landing on cancellation.
 *
 * This module is pure — no Firebase, no Paraglide, no browser API — so it can
 * be tested directly. The component maps the topic it returns onto the
 * translated answer, which keeps the English and Tamil copy in the message
 * catalogue where the rest of the app's text lives.
 */
/**
 * Detects the language used for this question without sending it anywhere.
 * Tamil has a dedicated Unicode block; Latin-script input, including Tanglish,
 * uses English copy. Numbers and punctuation fall back to the interface locale.
 */
export function questionLocale(question) {
    if (/[\u0B80-\u0BFF]/u.test(question))
        return 'ta';
    if (/[A-Za-z]/u.test(question))
        return 'en';
    return null;
}
/**
 * Requests Payani must decline rather than answer.
 *
 * Checked before topic matching: "cancel my ticket" should be met with "I can't
 * do that, here is how you do it", not silently answered as though the question
 * had been "how does cancellation work". The distinction is the difference
 * between an assistant and something that pretends to have acted.
 */
const ACTION_PHRASES = [
    'book me',
    'book a ticket for me',
    'book my',
    'cancel my',
    'cancel it',
    'refund my',
    'pay for me',
    'do it for me',
    'can you book',
    'can you cancel',
    'can you refund',
    'please book',
    'please cancel',
    'எனக்கு புக்',
    'என் டிக்கெட்டை ரத்து',
    'நீங்களே',
    'enaku book',
    'enakku book',
    'en ticket ah cancel',
    'ticket ah cancel pannu',
    'book pannu',
    'cancel pannu'
];
/**
 * Markers that make something a question rather than an instruction.
 *
 * "Cancel my ticket" is a request to act. "How can I cancel my ticket?" is a
 * question about cancelling, and answering it with "I can't do that for you"
 * would be obtuse — it is one of the suggested questions. The two share the
 * phrase "cancel my", so the phrase alone cannot tell them apart; the presence
 * of an interrogative can.
 *
 * Matched anywhere rather than at the start, because Tamil and Tanglish put the
 * interrogative late: "ticket ah epdi cancel panradhu".
 */
const QUESTION_MARKERS = [
    'how',
    'what',
    'where',
    'when',
    'why',
    'which',
    'epdi',
    'eppadi',
    'epadi',
    'enna',
    'எப்படி',
    'என்ன',
    'எங்கே',
    'எப்போது',
    'என்றால்'
];
/*
    Keyword lists. English, Tamil script, and Tanglish for each topic.

    These are matching data, not copy — they are never shown to anyone, so they
    stay here rather than in the message catalogue. The translated answers do
    live there.
*/
const TOPICS = [
    {
        id: 'greeting',
        keywords: ['hello', 'hi there', 'hey', 'good morning', 'good evening', 'vanakkam', 'வணக்கம்', 'hai']
    },
    {
        id: 'thanks',
        keywords: ['thank', 'thanks', 'nandri', 'நன்றி', 'romba nandri', 'super', 'ok thanks']
    },
    {
        id: 'book',
        keywords: [
            'how do i book', 'how to book', 'book a bus', 'book a ticket', 'booking process',
            'make a booking', 'reserve a seat', 'buy a ticket',
            'எப்படி முன்பதிவு', 'முன்பதிவு செய்வது', 'பஸ் புக்', 'டிக்கெட் புக்',
            'book panradhu', 'book pandrathu', 'book epdi', 'epdi book', 'bus book',
            'ticket book', 'munpathivu'
        ]
    },
    {
        id: 'search',
        keywords: [
            'search for a bus', 'find a bus', 'available buses', 'which buses', 'bus timings',
            'see routes', 'explore', 'search buses', 'bus list',
            'பேருந்து தேட', 'பஸ் தேட', 'பேருந்துகள்',
            'bus search', 'bus irukka', 'bus eppo', 'timing'
        ]
    },
    {
        id: 'seat',
        keywords: [
            'select a seat', 'choose a seat', 'seat selection', 'pick a seat', 'window seat',
            'aisle seat', 'seat map', 'change my seat', 'how do i select',
            'இருக்கை', 'சீட்', 'இருக்கையை',
            'seat select', 'seat epdi', 'seat theriv', 'window seat venum'
        ]
    },
    {
        id: 'sleeper',
        strong: ['sleeper', 'berth', 'ஸ்லீப்பர்'],
        keywords: [
            'sleeper', 'berth', 'upper berth', 'lower berth', 'sleeping', 'lie down',
            'படுக்கை', 'ஸ்லீப்பர்',
            'sleeper bus', 'sleeper na', 'berth na'
        ]
    },
    {
        id: 'payment',
        keywords: [
            'how do i pay', 'payment', 'pay for', 'upi', 'card payment', 'net banking',
            'razorpay', 'is it safe to pay', 'payment methods', 'payment options',
            'கட்டணம்', 'பணம் செலுத்த', 'பேமெண்ட்',
            'pay panradhu', 'payment epdi', 'panam', 'card use'
        ]
    },
    {
        id: 'pnr',
        strong: ['pnr'],
        keywords: [
            'what is a pnr', 'pnr number', 'booking reference', 'reference number', 'pnr',
            'what does pnr', 'pnr mean',
            'பிஎன்ஆர்', 'முன்பதிவு எண்',
            'pnr na enna', 'pnr enna', 'pnr nu'
        ]
    },
    {
        id: 'ticket',
        keywords: [
            'find my ticket', 'where is my ticket', 'see my ticket', 'download ticket',
            'ticket copy', 'my trips', 'my bookings', 'view ticket', 'ticket email',
            'டிக்கெட் எங்கே', 'என் டிக்கெட்', 'என் பயணங்கள்',
            'ticket enga', 'ticket epdi paakrathu', 'ticket kidaikum'
        ]
    },
    {
        id: 'qr',
        strong: ['qr', 'qr code', 'ஸ்கேன்'],
        keywords: [
            'qr', 'qr code', 'scan', 'barcode', 'scan my ticket',
            'க்யூஆர்', 'ஸ்கேன்',
            'qr code na', 'scan panra'
        ]
    },
    {
        id: 'boarding',
        strong: ['boarding', 'ஏறுதல்'],
        keywords: [
            'boarding', 'what does boarding mean', 'board the bus', 'get on the bus',
            'boarding point', 'boarding time', 'platform', 'when should i reach',
            'ஏறுதல்', 'ஏற வேண்டும்', 'நடைமேடை',
            'boarding na enna', 'bus ku ere', 'eppo pogaanum'
        ]
    },
    {
        id: 'cancel',
        strong: ['cancel', 'cancellation', 'ரத்து'],
        keywords: [
            'cancel a ticket', 'cancel my booking', 'how to cancel', 'cancellation',
            'cancel the trip', 'cancellation charge', 'cancellation fee',
            'ரத்து', 'ரத்து செய்ய', 'கேன்சல்',
            'cancel panradhu', 'cancel epdi', 'rathu'
        ]
    },
    {
        id: 'refund',
        strong: ['refund', 'ரீஃபண்ட்'],
        keywords: [
            'refund', 'money back', 'get my money', 'when will i get',
            'திரும்பப் பெற', 'பணம் திரும்ப', 'ரீஃபண்ட்',
            'refund epdi', 'panam thirumba', 'money epo varum'
        ]
    },
    {
        id: 'track',
        keywords: [
            'track', 'where is my bus', 'live location', 'bus location', 'running status',
            'கண்காணி', 'பஸ் எங்கே',
            'track panna', 'bus enga iruku', 'live la'
        ]
    },
    {
        id: 'transactions',
        keywords: [
            'transaction', 'payment history', 'past payments', 'spending', 'receipts',
            'பரிவர்த்தனை', 'கட்டண வரலாறு',
            'transaction history', 'evlo spend'
        ]
    },
    {
        id: 'account',
        keywords: [
            'account', 'sign in', 'log in', 'login', 'register', 'sign up', 'password',
            'create an account', 'forgot',
            'கணக்கு', 'உள்நுழை', 'பதிவு',
            'account create', 'login epdi', 'password marandhutten'
        ]
    },
    {
        id: 'language',
        keywords: [
            'language', 'tamil', 'english', 'change language', 'in tamil',
            'மொழி', 'தமிழில்', 'மொழியை மாற்ற',
            'language maathu', 'tamil la'
        ]
    },
    {
        id: 'accessible',
        keywords: [
            'wheelchair', 'accessible', 'disability', 'disabled', 'step free', 'assistance',
            'accessible travel',
            'சக்கர நாற்காலி', 'மாற்றுத்திறனாளி', 'உதவி தேவை',
            'wheelchair venum', 'accessible seat'
        ]
    },
    {
        id: 'concession',
        strong: ['concession', 'சலுகை'],
        keywords: [
            'concession', 'discount', 'senior citizen', 'student', 'cheaper fare',
            'சலுகை', 'தள்ளுபடி', 'மூத்த குடிமக்கள்', 'மாணவர்',
            'concession kidaikuma', 'discount iruka'
        ]
    },
    {
        id: 'luggage',
        strong: ['luggage', 'சாமான்'],
        keywords: [
            'luggage', 'bag', 'baggage', 'suitcase', 'carry', 'how much can i bring',
            'சாமான்', 'பை', 'உடைமை',
            'luggage kondu போக', 'bag eduthu', 'luggage edukalama'
        ]
    },
    {
        id: 'missed',
        keywords: [
            'missed the bus', 'miss my bus', 'late', 'bus left', 'i was late',
            'did not board',
            'தவறவிட்ட', 'தாமதம்', 'பஸ் போயிடுச்',
            'bus miss', 'late aiten', 'bus poiduchu'
        ]
    },
    {
        id: 'vazhi',
        keywords: [
            'what is vazhi', 'how does vazhi work', 'about vazhi', 'who are you',
            'what can you do', 'what is this app', 'help me understand',
            'வழி என்றால்', 'வழி எப்படி', 'நீ யார்',
            'vazhi na enna', 'vazhi epdi', 'nee yaaru'
        ]
    },
    {
        id: 'help',
        keywords: [
            'contact', 'support', 'customer care', 'complaint', 'problem with',
            'speak to someone', 'phone number',
            'உதவி', 'புகார்', 'தொடர்பு',
            'help venum', 'yaarayavathu', 'complaint pannanum'
        ]
    }
];
/** Lower-cased, punctuation stripped, whitespace collapsed. */
function normalise(value) {
    return value
        .toLocaleLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
/**
 * Score floor.
 *
 * Below this, Payani says it does not know. Set so a single short incidental
 * word cannot carry a match — "bus" alone should not answer the booking
 * question — while a real question comfortably clears it.
 */
const MIN_SCORE = 4;
/** What an unmistakable short token is worth. Comfortably over `MIN_SCORE`. */
const STRONG_SCORE = 6;
/**
 * Picks the best topic for a question.
 *
 * A keyword's contribution is its length, so a specific phrase outweighs a
 * generic word. Ties resolve to whichever topic is declared first, which is why
 * the list is ordered roughly by how common the question is.
 */
export function matchTopic(question) {
    const text = normalise(question);
    if (text === '')
        return { topic: null, score: 0 };
    // An instruction to act is answered as such — but only if it is not phrased
    // as a question about how to do it.
    // Whole words only. Padding the text is what makes that work — padding the
    // marker literal would not, because `normalise` trims, and "enna" would then
    // match inside "chennai".
    const padded = ` ${text} `;
    const isQuestion = QUESTION_MARKERS.some((marker) => padded.includes(` ${normalise(marker)} `));
    if (!isQuestion) {
        for (const phrase of ACTION_PHRASES) {
            if (text.includes(normalise(phrase)))
                return { topic: 'cannot', score: 100 };
        }
    }
    let best = null;
    let bestScore = 0;
    for (const topic of TOPICS) {
        let score = 0;
        for (const keyword of topic.strong ?? []) {
            const needle = normalise(keyword);
            // Whole-word only: "pnr" should not fire inside another word.
            if (needle !== '' && new RegExp(`(^| )${needle}( |$)`).test(text))
                score += STRONG_SCORE;
        }
        for (const keyword of topic.keywords) {
            const needle = normalise(keyword);
            if (needle !== '' && text.includes(needle))
                score += needle.length;
        }
        if (score > bestScore) {
            bestScore = score;
            best = topic.id;
        }
    }
    return bestScore >= MIN_SCORE ? { topic: best, score: bestScore } : { topic: null, score: bestScore };
}
/** Every topic that has a suggestion chip, in the order they are offered. */
export const SUGGESTED_TOPICS = [
    'book',
    'pnr',
    'seat',
    'cancel',
    'ticket',
    'boarding',
    'payment',
    'refund',
    'sleeper',
    'luggage',
    'missed',
    'vazhi'
];
