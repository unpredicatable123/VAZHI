import { SUGGESTED_TOPICS, matchTopic, questionLocale } from '../src/lib/services/payani.service';
/**
 * Payani's matcher.
 *
 * Pure — no model, no network, no key, no emulator: `npm run test:payani`.
 * These assertions are the whole of Payani's behaviour, so they are where a
 * regression would show up.
 */
let pass = 0;
let fail = 0;
function eq(label, actual, expected) {
    if (actual === expected) {
        pass++;
        console.log(`  ok    ${label}`);
    }
    else {
        fail++;
        console.log(`  FAIL  ${label}\n          got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`);
    }
}
function check(label, condition, detail = '') {
    if (condition) {
        pass++;
        console.log(`  ok    ${label}${detail ? '  — ' + detail : ''}`);
    }
    else {
        fail++;
        console.log(`  FAIL  ${label}${detail ? '  — ' + detail : ''}`);
    }
}
const topicOf = (q) => matchTopic(q).topic;
console.log('ENGLISH — the questions the chips offer\n');
for (const [question, expected] of [
    ['How do I book a bus?', 'book'],
    ['What is a PNR?', 'pnr'],
    ['How do I select a seat?', 'seat'],
    ['How can I cancel my ticket?', 'cancel'],
    ['Where can I find my ticket?', 'ticket'],
    ['What does boarding mean?', 'boarding'],
    ['How do I pay for my ticket?', 'payment'],
    ['How does the refund process work?', 'refund'],
    ['What is a sleeper berth?', 'sleeper'],
    ['Can I carry luggage on the bus?', 'luggage'],
    ['What if I miss my bus?', 'missed'],
    ['How does VAZHI work?', 'vazhi']
]) {
    eq(question, topicOf(question), expected);
}
console.log('\nENGLISH — asked differently\n');
for (const [question, expected] of [
    ['i want to book a ticket', 'book'],
    ['how to cancel', 'cancel'],
    ['when will i get my money back', 'refund'],
    ['is it safe to pay by card', 'payment'],
    ['where is my bus right now', 'track'],
    ['can i get a window seat', 'seat'],
    ['what does pnr mean', 'pnr'],
    ['do you have wheelchair access', 'accessible'],
    ['senior citizen discount', 'concession'],
    ['how do i change language to tamil', 'language'],
    ['i forgot my password', 'account'],
    ['what is the qr code for', 'qr']
]) {
    eq(question, topicOf(question), expected);
}
console.log('\nTAMIL\n');
for (const [question, expected] of [
    ['பேருந்தை எப்படி முன்பதிவு செய்வது?', 'book'],
    ['PNR என்றால் என்ன?', 'pnr'],
    ['இருக்கையை எப்படித் தேர்ந்தெடுப்பது?', 'seat'],
    ['டிக்கெட்டை ரத்து செய்ய வேண்டும்', 'cancel'],
    ['என் டிக்கெட் எங்கே?', 'ticket'],
    ['வணக்கம்', 'greeting'],
    ['நன்றி', 'thanks']
]) {
    eq(question, topicOf(question), expected);
}
eq('Tamil-script question selects a Tamil reply', questionLocale('டிக்கெட்டை எப்படி ரத்து செய்வது?'), 'ta');
console.log('\nTANGLISH\n');
for (const [question, expected] of [
    ['bus epdi book panradhu', 'book'],
    ['PNR na enna', 'pnr'],
    ['ticket enga kidaikum', 'ticket'],
    ['seat epdi select panradhu', 'seat'],
    ['refund epdi varum', 'refund'],
    ['bus enga iruku', 'track'],
    ['sleeper na enna', 'sleeper']
]) {
    eq(question, topicOf(question), expected);
}
eq('Tanglish question uses the English reply catalogue', questionLocale('ticket epdi cancel panradhu?'), 'en');
eq('English question selects an English reply', questionLocale('How do I cancel my ticket?'), 'en');
eq('language-neutral input falls back to the interface', questionLocale('12345?!'), null);
console.log('\nASKED TO ACT — explains, never pretends\n');
for (const question of [
    'Book me a bus to Chennai',
    'cancel my ticket',
    'can you book a seat for me',
    'please cancel my booking',
    'refund my money',
    'enakku book pannu'
]) {
    eq(question, topicOf(question), 'cannot');
}
check('an action request outranks its own topic', topicOf('cancel my ticket') === 'cannot' && topicOf('how to cancel') === 'cancel');
console.log('\nSAYS IT DOES NOT KNOW\n');
for (const question of [
    '',
    '   ',
    'what is the capital of France',
    'write me a poem',
    'asdfghjkl',
    '2 + 2'
]) {
    eq(JSON.stringify(question), topicOf(question), null);
}
check('a bare noun does not trigger an answer', topicOf('bus') === null, 'score floor holds');
console.log('\nSTRUCTURE\n');
check('twelve suggestion chips', SUGGESTED_TOPICS.length === 12, String(SUGGESTED_TOPICS.length));
check('chips are unique', new Set(SUGGESTED_TOPICS).size === SUGGESTED_TOPICS.length);
check('every chip resolves to its own topic', SUGGESTED_TOPICS.every((topic) => topic !== 'cannot'));
check('matching is case insensitive', topicOf('HOW DO I BOOK A BUS') === 'book');
check('punctuation is ignored', topicOf('what is a pnr???') === 'pnr');
check('leading and trailing space is ignored', topicOf('   how to cancel   ') === 'cancel');
console.log(`\n--- ${pass} passed, ${fail} failed ---`);
process.exit(fail ? 1 : 0);
