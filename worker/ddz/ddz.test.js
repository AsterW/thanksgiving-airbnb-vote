import test from 'node:test';
import assert from 'node:assert/strict';
import { deck, legalPlay, readPlay, shuffle, takeFrom, value } from './cards.js';
import { beatOptions } from './hints.js';
import { choosePlay } from './bot.js';
import { DdzGame } from './game.js';

const P = cards => readPlay(cards)[0]; // the play these cards make
const ranks = cards => cards.map(value).sort((a, b) => a - b);

test('提示 lists every way to beat the table, cheapest first, all legal', () => {
  const hand = ['7♠', '7♥', '9♣', '2♦', 'sj', 'bj', 'K♠', 'K♥', 'K♣', 'K♦'];
  const opts = beatOptions(hand, P(['5♠']));
  assert.deepEqual(opts.map(ranks), [[9], [15], [7], [13], [16], [17], [13, 13, 13, 13], [16, 17]]);
  for (const o of opts) { assert.ok(legalPlay(o, P(['5♠'])), o.join()); assert.ok(takeFrom(hand, o)); }
});

test('when only a split bomb or the bomb beats it, 提示 still finds it (the bot would pass)', () => {
  const hand = ['3♠', '4♠', '6♥', 'K♠', 'K♥', 'K♣', 'K♦'];
  const prev = P(['Q♠', 'Q♥']);
  assert.equal(choosePlay(hand, prev, { oppMin: 17 }), null, 'the bot holds back');
  assert.deepEqual(beatOptions(hand, prev).map(ranks), [[13, 13], [13, 13, 13, 13]]);
});

test("a farmer whose teammate led can still be shown a beat", () => {
  const hand = ['8♠', '8♥', 'J♣', 'A♦'];
  const prev = P(['6♣', '6♦']);
  assert.equal(choosePlay(hand, prev, { teammateLed: true, oppMin: 10 }), null);
  assert.deepEqual(beatOptions(hand, prev).map(ranks), [[8, 8]]);
});

test('runs, triples with kickers, planes and four-with-two', () => {
  assert.deepEqual(beatOptions(['4♠', '5♠', '6♥', '7♣', '8♦', '9♠', 'K♥'], P(['3♠', '4♥', '5♣', '6♦', '7♠'])).map(ranks),
    [[4, 5, 6, 7, 8], [5, 6, 7, 8, 9]]);
  assert.deepEqual(beatOptions(['5♠', '5♥', '5♣', '6♦', '9♠', '9♥', '9♣', '9♦'], P(['3♠', '3♥', '3♣', '4♦'])).map(ranks),
    [[5, 5, 5, 6], [6, 9, 9, 9], [9, 9, 9, 9]]);
  const plane = beatOptions(['6♠', '6♥', '6♣', '7♠', '7♥', '7♣', '3♦', 'J♠', 'Q♠'], P(['4♠', '4♥', '4♣', '5♠', '5♥', '5♣', '8♦', '9♦']));
  assert.deepEqual(plane.map(ranks), [[3, 6, 6, 6, 7, 7, 7, 11]]);
  const four2 = beatOptions(['J♠', 'J♥', 'J♣', 'J♦', '3♠', '4♥'], P(['8♠', '8♥', '8♣', '8♦', '5♠', '6♥']));
  assert.deepEqual(four2.map(ranks), [[3, 4, 11, 11, 11, 11], [11, 11, 11, 11]]);
});

test('nothing beats it: no options; a bomb on the table only falls to a bigger bomb or the rocket', () => {
  assert.deepEqual(beatOptions(['3♠', '4♥', '9♣', 'K♦'], P(['A♠', 'A♥'])), []);
  assert.deepEqual(beatOptions(['5♠', '5♥', '5♣', '5♦', 'Q♠', 'Q♥', 'Q♣', 'Q♦', 'sj', 'bj'], P(['9♠', '9♥', '9♣', '9♦'])).map(ranks),
    [[12, 12, 12, 12], [16, 17]]);
  assert.deepEqual(beatOptions(['2♠', '2♥', '2♣', '2♦'], P(['sj', 'bj'])), []);
});

test('random hands: whenever the bot can beat it, so can 提示; every option is legal', () => {
  let a = 7;
  const rand = () => ((a = (a * 1103515245 + 12345) >>> 0) / 4294967296);
  for (let round = 0; round < 400; round++) {
    const d = shuffle(deck(), rand);
    const hand = d.slice(0, 17), other = d.slice(17, 34);
    const lead = choosePlay(other, null, {});
    const prev = legalPlay(lead, null);
    const opts = beatOptions(hand, prev);
    const bot = choosePlay(hand, prev, { oppMin: 1 }); // the bot at its most willing
    if (bot) assert.ok(opts.length, `bot beats ${lead.join(' ')} with ${bot.join(' ')}, 提示 found nothing`);
    for (const o of opts) { assert.ok(legalPlay(o, prev), o.join(' ') + ' vs ' + lead.join(' ')); assert.ok(takeFrom(hand, o)); }
  }
});

// A table of three people with hand-driven timers.
function table() {
  let a = 3;
  const g = new DdzGame({ now: () => 1000, rand: () => ((a = (a * 1103515245 + 12345) >>> 0) / 4294967296),
    schedule: fn => ({ fn }), cancel: () => {}, save: () => {} });
  for (const k of ['a', 'b', 'c']) g.sit(k, k.toUpperCase());
  g.start('a');
  return { g, timeUp: () => g.timer.fn() };
}

test('time up while bidding is 不叫 (or 不抢) — nobody is made landlord without saying so', () => {
  const { g, timeUp } = table();
  assert.equal(g.phase, 'bidding');
  const first = g.turn;
  timeUp();
  assert.equal(g.said[first], '不叫');
  assert.notEqual(g.turn, first);
  // another table: the first one calls, the next one runs out of time in the grab round
  const t2 = table();
  t2.g.bidAction(t2.g.seats[t2.g.turn].key, true);
  const grabber = t2.g.turn;
  t2.timeUp();
  assert.equal(t2.g.said[grabber], '不抢');
  assert.equal(t2.g.phase, 'bidding');
});

test('three 不叫: shuffled and dealt again, and the page is told', () => {
  const { g, timeUp } = table();
  const round = g.round, hand = g.seats[0].cards.join();
  timeUp(); timeUp(); timeUp();
  assert.equal(g.phase, 'bidding');
  assert.equal(g.round, round + 1);
  assert.notEqual(g.seats[0].cards.join(), hand);
  assert.deepEqual(g.said, [null, null, null]);
  assert.equal(g.view('a').redealtAt, 1000);
});
