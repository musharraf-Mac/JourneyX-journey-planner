import assert from 'node:assert/strict';
import test from 'node:test';
import { findJourneys, connections, stops } from '../lib/network.ts';

test('direct bus totals include a single boarding fee and wait', () => {
  const [route] = findJourneys('fort', 'mount', 'Fastest', []);
  assert.equal(route.minutes, 52);
  assert.equal(route.fare, 95);
  assert.equal(route.transfers, 0);
  assert.equal(route.reliability, 85);
});

test('different priorities recommend different journeys', () => {
  const [fast] = findJourneys('wellawatte', 'narahenpita', 'Fastest', []);
  const [cheap] = findJourneys('wellawatte', 'narahenpita', 'Cheapest', []);
  assert(cheap.fare < fast.fare);
  assert(cheap.minutes > fast.minutes);
});

test('closures exclude connections and delays change estimates', () => {
  const [base] = findJourneys('fort', 'mount', 'Fastest', []);
  const closed = findJourneys('fort', 'mount', 'Fastest', [{ edgeId: 'e0', kind: 'closed', delay: 0 }]);
  assert(closed.every(j => !j.legs.some(e => e.id === 'e0')));
  assert(closed[0].minutes > base.minutes);
  const [delayed] = findJourneys('fort', 'mount', 'Fastest', [{ edgeId: 'e0', kind: 'delay', delay: 15 }]);
  assert(delayed.minutes > base.minutes);
});

test('same-stop, invalid, service-disconnected, and closed networks return no journeys', () => {
  assert.deepEqual(findJourneys('fort', 'fort', 'Balanced', []), []);
  assert.deepEqual(findJourneys('unknown', 'fort', 'Balanced', []), []);
  assert.deepEqual(findJourneys('fort', 'rajagiriya', 'Balanced', [], '177'), []);
  assert.deepEqual(findJourneys('fort', 'mount', 'Balanced', connections.map(e => ({ edgeId: e.id, kind: 'closed', delay: 0 }))), []);
});

test('all distinct bus stop pairs connect without loops or broken legs', () => {
  for (const from of stops) for (const to of stops) {
    if (from.id === to.id) continue;
    const routes = findJourneys(from.id, to.id, 'Balanced', []);
    assert(routes.length > 0);
    for (const route of routes) {
      assert.equal(route.nodes[0], from.id);
      assert.equal(route.nodes.at(-1), to.id);
      assert.equal(new Set(route.nodes).size, route.nodes.length);
      assert(route.fare > 0 && route.minutes > 0);
      route.legs.forEach((leg, i) => {
        assert([leg.from, leg.to].includes(route.nodes[i]));
        assert([leg.from, leg.to].includes(route.nodes[i + 1]));
      });
    }
  }
});
