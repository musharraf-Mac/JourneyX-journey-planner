# JourneyX

A Next.js frontend for BuildX Challenge 04: public transport reliability and journey planning. Sunset orange and navy, responsive layouts, and Light / Dark / System themes. Guest demo planning needs no database. Accounts and saved journeys require PostgreSQL; the assistant requires OpenAI credentials. See INTEGRATIONS.md.

## Run

From this directory:

```sh
npm install
npm run dev
```

Open http://localhost:3000. For a production build, run `npm run build` and `npm start`.

## Features

- Origin/destination selection and swapping, bus/train filters, four ranking priorities.
- Three alternative journeys where available; estimated fares, duration, transfers, reliability, comparison table, and boarding timeline.
- Draggable and zoomable schematic network, stop labels, destination selector, mobile list/map switch.
- Account-owned journeys persisted in PostgreSQL; theme persisted in localStorage.
- Delay and closure simulation, individual removal, and reset.
- Same-stop and disconnected-route states; keyboard controls and native modal dialogs.

## Data and computation

`lib/network.ts` owns the typed demo network and pure route-search function. The UI lives in `app/page.tsx`, shared visual components in `app/components.tsx`, and theme/responsive styles in `app/globals.css`.

The simulated Colombo network contains 16 stops and 27 bidirectional connections. All times, fares, services, and reliability values are illustrative. The SVG map is schematic, not a geographic navigation map. No external map service is needed.

The demo enumerates simple paths, then ranks them. Fastest minimises time; Cheapest minimises fare; Reliable maximises the modelled reliability score. Balanced weighs time relative to the fastest available journey (35%), fare relative to the cheapest (30%), transfers (15%), and reliability penalty (20%). These weights apply to scaled terms, not calibrated arrival probabilities.

Each boarding adds a waiting time (bus: 5 minutes, train: 10) and base fare (bus: LKR 25, train: LKR 65). Connections add incremental fares and ride times. A service change adds 3 minutes. Reliability is a travel-time-weighted service score minus 3 per transfer and 0.6 per delay minute, floored at 10.

Exhaustive search is appropriate only for this small graph. A larger network should use a bounded, multi-criteria shortest-path algorithm with service state and timetable-aware transfers.

## Validation

With Node.js 24:

```sh
node --experimental-strip-types --test tests/network.test.mjs
npm run build
```

Tests cover all 240 distinct stop pairs, fare/wait totals, priority differences, closures, delays, invalid input, disconnected routes, and loop prevention.

## Next stage

Add PostgreSQL-backed stops, services, connections, fares, and disruption records through a data-access boundary. Keep the UI models stable, move routing to the server, and replace demo assumptions with validated data. No Django service is required by this frontend.

## Limitations

No real-time tracking, verified departure schedules, or actual walking directions yet. Account endpoints and database-backed saves are implemented but require configured PostgreSQL. Saved items are journey preferences, not tickets or fixed itinerary snapshots. Simulations reset on page reload. Visual browser QA could not run in the current automation environment; production compilation and routing tests passed.
