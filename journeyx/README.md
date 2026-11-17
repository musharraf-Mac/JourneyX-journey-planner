# JourneyX

A Next.js frontend for BuildX Challenge 04: public transport reliability and journey planning. Sunset orange and navy, responsive layouts, and Light / Dark / System themes. Guest demo planning needs no database. Accounts and saved journeys require PostgreSQL; the assistant requires Groq credentials. See INTEGRATIONS.md.

## Run

From this directory:

```sh
npm install
npm run dev
```

Open http://localhost:3000. For a production build, run `npm run build` and `npm start`.

## Features

- Origin/destination selection and swapping, four bus journey ranking priorities.
- Three alternative journeys where available; estimated fares, duration, transfers, reliability, comparison table, and boarding timeline.
- Interactive OpenStreetMap street map, approximate bus stop markers, and opt-in location tracking with an accuracy circle.
- Account-owned journeys persisted in PostgreSQL; theme persisted in localStorage.
- Delay and closure simulation, individual removal, and reset.
- Same-stop and disconnected-route states; keyboard controls and native modal dialogs.

## Data and computation

`lib/network.ts` owns the typed demo network and pure route-search function. The UI lives in `app/page.tsx`, shared visual components in `app/components.tsx`, and theme/responsive styles in `app/globals.css`.

The Colombo network contains 19 stop areas and 26 bidirectional bus connections. Bus 177 includes selected areas from a published route directory. Travel time, fare, and reliability remain simulated. The street map uses OpenStreetMap tiles. Dashed connections show approximate stop-to-stop links.

The demo enumerates simple paths, then ranks them. Fastest minimises time; Cheapest minimises fare; Reliable maximises the modelled reliability score. Balanced weighs time relative to the fastest available journey (35%), fare relative to the cheapest (30%), transfers (15%), and reliability penalty (20%). These weights apply to scaled terms, not calibrated arrival probabilities.

Each boarding adds 5 minutes of waiting time and a base fare of LKR 25. Connections add incremental fares and ride times. A service change adds 3 minutes. Reliability is a travel-time-weighted service score minus 3 per transfer and 0.6 per delay minute, floored at 10.

Exhaustive search is appropriate only for this small graph. A larger network should use a bounded, multi-criteria shortest-path algorithm with service state and timetable-aware transfers.

## Validation

With Node.js 24:

```sh
node --experimental-strip-types --test tests/network.test.mjs
npm run build
```

Tests cover all 342 distinct stop pairs, fare/wait totals, priority differences, closures, delays, invalid input, disconnected routes, and loop prevention.

## Next stage

Add PostgreSQL-backed stops, services, connections, fares, and disruption records through a data-access boundary. Keep the UI models stable, move routing to the server, and replace demo assumptions with validated data. No Django service is required by this frontend.

## Limitations

Passenger location tracking requires browser permission and HTTPS or localhost. Live vehicle tracking, verified departures, and walking directions are outside the current coverage. Account endpoints and database-backed saves are implemented but require configured PostgreSQL. Saved items are journey preferences, not tickets or fixed itinerary snapshots. Simulations reset on page reload. Visual browser QA could not run in the current automation environment; production compilation and routing tests passed.
