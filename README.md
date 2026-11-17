# JourneyX

JourneyX is a bus journey planner developed by **Cortex Crew** for **BuildX 0.1 - Applied Computing & Innovation Hackathon**.

**Selected challenge:** Challenge 04 - Intelligent Public Transport Reliability and Journey Planning.

## Team

| Detail | Value |
| --- | --- |
| Team name | Cortex Crew |
| Official team identifier | [Add organiser-assigned team ID] |
| Institution | [Add institution / university] |
| Team leader | [Your full name] |
| Repository | [Add private GitHub repository link] |
| Application demo | [Add deployed URL, or use the local setup below] |
| Presentation | [Add presentation link] |

Replace the placeholders before submission. Add the originally registered team members and remove unused optional rows.

| Role | Full name | Student / registration ID | Contributions | GitHub profile |
| --- | --- | --- | --- | --- |
| Team leader | [Your full name] | [Your student ID] | [Your responsibilities] | [Your GitHub URL] |
| Member 2 | [Full name] | [Student ID] | [Responsibilities] | [GitHub URL] |
| Member 3 | [Full name] | [Student ID] | [Responsibilities] | [GitHub URL] |
| Member 4 | [Full name] | [Student ID] | [Responsibilities] | [GitHub URL] |
| Member 5, if registered | [Full name] | [Student ID] | [Responsibilities] | [GitHub URL] |
| Member 6, if registered | [Full name] | [Student ID] | [Responsibilities] | [GitHub URL] |

## Problem being addressed

Sri Lankan public transport users face uncertainty about travel duration, fares, transfers, and service reliability. Different commuters have different priorities. A low-cost journey may take longer, while a faster route may require a less convenient transfer.

JourneyX helps users compare these trade-offs before choosing a bus journey.

## Proposed solution

Users select an origin, destination, and priority. JourneyX searches a graph of bus connections, calculates journey metrics, and ranks up to three alternatives where available.

- Fastest minimises estimated duration.
- Cheapest minimises estimated fare.
- Reliable maximises the modelled reliability score.
- Balanced combines duration, cost, transfers, and reliability.

Users can inspect boarding and transfer instructions, compare journeys, and apply simulated delays or closures. The bus assistant answers route questions using the same computation. Groq provides general application help.

The interface supports mobile screens and light, dark, and system themes with sunset orange and navy styling. Guests can plan and compare journeys. Accounts enable saved journey preferences in PostgreSQL. The street map supports opt-in passenger location tracking.

## Challenge requirements and implemented scope

The following maps Challenge 04's functional requirements and MVP criteria to the application.

| Handbook requirement | JourneyX implementation |
| --- | --- |
| Represent transport routes as a graph | Bus stop areas are nodes, with weighted bidirectional connections |
| Maintain stops and connections | 19 stop areas and 26 connections in the bundled dataset |
| Select start and destination | Stop selectors and a swap control |
| Generate multiple journeys | Up to three distinct paths where available |
| Calculate estimated costs | Boarding fares and incremental connection fares |
| Estimate journey durations | Ride times, waits, transfers, and simulated delays |
| Compare transfers and reliability | Journey cards and comparison table |
| Rank alternatives | Four priority presets and weighted scoring |
| Explain recommendations | Metric-based explanations, boarding timeline, and route assistant |
| At least 15 nodes and 20 connections | 19 nodes and 26 connections |
| At least two recommendations where available | Search returns up to three alternatives |

Implemented extensions include service delay simulation, closure-based rerouting, and user-selected priorities. Historical delay analysis and railway integration are outside the current bus-only scope.

## Technology stack

| Responsibility | Technology |
| --- | --- |
| Application and server endpoints | Next.js 16, React 19, TypeScript |
| Styling | CSS with responsive layouts and theme variables |
| Street map | Leaflet 1.9 and OpenStreetMap tiles |
| Database | PostgreSQL hosted on Supabase, with local PostgreSQL support |
| Database access and migrations | Prisma 6 |
| General help assistant | Groq chat completions API |
| Route computation | TypeScript graph search and weighted ranking |
| Account security | Node.js scrypt, hashed session tokens, HttpOnly cookies |
| Validation | Node.js test runner, TypeScript, Next.js production build |

Package versions and resolved dependencies are recorded in the application manifest and lockfile.

## Architecture overview

~~~mermaid
flowchart TD
    User[Browser user] --> UI[Next.js interface]
    UI --> Planner[Shared bus graph and ranking logic]
    UI --> Map[Leaflet street map and browser geolocation]
    Map --> Tiles[OpenStreetMap tiles]
    UI --> Account[Account and saved journey endpoints]
    Account --> Prisma[Prisma Client]
    Prisma --> Database[(Supabase PostgreSQL)]
    UI --> Assistant[Assistant endpoint]
    Assistant --> Planner
    Assistant --> Help[Groq general help]
~~~

The planner runs with bundled bus data. PostgreSQL stores users, sessions, and saved journey preferences. Transport models also exist in the schema for future data ingestion, but the current route search reads its graph from the application code.

The assistant resolves named stops, spelling aliases, route numbers, and follow-up context before computing bus answers. General help prompts can use Groq. A built-in help response is available when the provider is unavailable.

| Source location | Responsibility |
| --- | --- |
| [Application page](journeyx/app/page.tsx) | Search, comparison, journey details, and simulations |
| [Street map](journeyx/app/network-map.tsx) | Map layers, stop markers, and location controls |
| [Account and chat UI](journeyx/app/account-ui.tsx) | Account dialogs and wrapped chat replies |
| [Bus network](journeyx/lib/network.ts) | Stops, connections, fares, and route search |
| [Bus assistant](journeyx/lib/bus-assistant.ts) | Route question interpretation and computed answers |
| [Server endpoints](journeyx/app/api/) | Accounts, saved journeys, and assistant requests |
| [Database schema](journeyx/prisma/schema.prisma) | PostgreSQL models |
| [Migrations](journeyx/prisma/migrations/) | Reproducible database creation |

## Computational approach

The search enumerates simple paths between two selected stops. A path cannot revisit a stop. Closed connections are removed before traversal, and an optional bus-number filter limits the allowed services.

For each candidate journey, the implementation calculates:

- **Boardings:** the first service plus each subsequent service change.
- **Transfers:** boardings minus one.
- **Duration:** summed ride times + 5 minutes per boarding + 3 minutes per transfer + simulated delays.
- **Fare:** summed incremental connection fares + LKR 25 per boarding.
- **Reliability:** travel-time-weighted service reliability, minus 3 points per transfer and 0.6 points per delay minute, rounded and floored at 10.

Balanced ranking uses this score, with lower values ranked first:

~~~text
0.35 × (duration / fastest candidate duration)
+ 0.30 × (fare / cheapest candidate fare)
+ 0.15 × transfers
+ 0.20 × ((100 - reliability) / 10)
~~~

The single-priority presets optimise their selected metric. Ties are resolved by duration and then fare.

Exhaustive search makes the small demonstration network easy to explain and inspect. Its worst-case path count grows rapidly, so a larger network would need a bounded shortest-path or multi-criteria routing algorithm.

## Installation instructions

Use Node.js 24 and npm. Clone the submitted repository and open its root folder.

~~~powershell
cd journeyx
npm ci
Copy-Item .env.example .env
~~~

Run the copy command only when creating a new environment file. Configure the existing file if one already exists.

| Environment variable | Purpose |
| --- | --- |
| DATABASE_URL | PostgreSQL connection URL used by Prisma |
| POSTGRES_PASSWORD | Password for the optional local Docker database |
| GROQ_API | Server-side Groq API key for general help |
| GROQ_MODEL | Optional Groq model, defaulting to openai/gpt-oss-20b |

For Supabase, use the project's session pooler connection string on port 5432. A placeholder example is:

~~~dotenv
DATABASE_URL="postgresql://postgres.PROJECT_REF:URL_ENCODED_PASSWORD@POOLER_HOST:5432/postgres?sslmode=require"
GROQ_API=""
GROQ_MODEL="openai/gpt-oss-20b"
~~~

Copy the actual hostname and username from Supabase's Connect dialog. URL-encode reserved characters in the password. Keep credentials in the ignored .env file. For this Prisma-based setup, disable the Supabase Data API to prevent unintended access through generated endpoints.

For local PostgreSQL, use the example localhost DATABASE_URL and matching POSTGRES_PASSWORD, then start the supplied container:

~~~powershell
docker compose up -d
~~~

After configuring either database, generate the client and apply the existing migration:

~~~powershell
npx prisma generate
npx prisma migrate deploy
npx prisma migrate status
~~~

## Execution instructions

Run the development server from the journeyx directory:

~~~powershell
npm run dev
~~~

Open [JourneyX locally](http://localhost:3000). Restart the server after changing environment variables.

To build and run a production version:

~~~powershell
npm run build
npm start
~~~

A hosted production application needs HTTPS for secure account cookies and browser location access. Development geolocation works on localhost with browser permission.

Guest route planning and computed bus answers use bundled data. Account saving requires PostgreSQL. Street tiles need internet access, while Groq is used for general help.

## Dataset, APIs, and acknowledgements

| Resource | Use and limitations |
| --- | --- |
| Bundled bus graph | Team-maintained demonstration dataset containing 19 stop areas and 26 bidirectional connections |
| [Bus 177 route directory](https://routemaster.lk/bus/177/) | Reference for selected areas between Kaduwela and Kollupitiya |
| [National Transport Commission route maps](https://www.ntc.gov.lk/Bus_info/route_map.php) | External reference for checking bus services |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | Street-map imagery with contributor attribution |
| [Leaflet](https://leafletjs.com/) | Interactive map library |
| [Groq](https://console.groq.com/docs) | General help responses through the server |
| [Supabase](https://supabase.com/docs) | Hosted PostgreSQL |
| [Prisma](https://www.prisma.io/docs) | Database client and migrations |
| [Next.js](https://nextjs.org/docs) and [React](https://react.dev/) | Application framework and UI library |

**Simulated data:** travel times, waiting times, fares, reliability values, and disruption events. These values demonstrate the algorithm and are not verified real-world findings.

Coordinates identify approximate stop areas. Dashed map lines connect those areas and do not establish the roads buses travel along. The app has no live timetable feed. Location tracking follows the passenger's device with permission and does not persist those coordinates.

**AI assistance disclosure:** OpenAI Codex assisted with implementation and documentation. Groq is used inside the application for general help. The team must review the work, understand the implementation, and confirm compliance with the organisers' declared AI policy before submission.

## Testing and validation

Run the automated tests and production build from journeyx:

~~~powershell
node --experimental-strip-types --test tests/network.test.mjs
npm run build
~~~

The five route tests cover all 342 ordered pairs of distinct stops, loop prevention, fare and waiting-time totals, differences between priorities, delays, closures, invalid input, same-stop input, and disconnected searches.

Development checks have also exercised assistant questions about Kaduwela, spelling aliases, reverse journeys, follow-up fares, bus numbers, and closures. Browser checks verified mobile chat wrapping at 360 px, loaded street tiles, and location movement and cleanup using simulated browser coordinates. Supabase migration status and read access to account, session, and saved-journey tables have been verified.

Before presenting, test registration, login, saving a journey, and restoring it after signing back in against the submission environment.

## Demonstration for judges

1. Search from **Wellawatte to Narahenpita** with the Fastest priority.
2. Change to Cheapest and explain the trade-off. With the default dataset and no disruptions, the fastest option is 35 minutes at LKR 82, while the cheapest is 36 minutes at LKR 81.
3. Open Compare and the journey timeline to show fares, transfers, and reliability.
4. Add a simulated delay or closure on a connection in the chosen journey. Show the recalculated alternatives, then reset the simulation.
5. Ask the assistant, “How to go from Kaduwele to Kollupitiya?” Show the bus 177 answer and its source reference.
6. Show the street map, optionally allow location access, then stop tracking.
7. Register or sign in and save a journey. Demonstrate that saved preferences belong to the signed-in account.

Use additional start/destination pairs during questions to demonstrate general route computation.

## Known limitations and future improvements

- Coverage is limited to the bundled Colombo-area bus network.
- Travel metrics and service reliability are simulated. Reliability is a model score rather than an on-time arrival probability.
- Real departures, walking directions, live bus locations, and historical delay analysis are not implemented.
- Connections assume bidirectional travel and simplified boarding/fare rules. Actual service directions, timetables, and fare stages need verified data.
- Exhaustive path enumeration is suitable for the current small graph.
- Saved journeys store preferences. Simulation settings reset after reload.
- Authentication still needs email verification, password recovery, and distributed throttling for wider production use.
- Device location accuracy and map tile availability depend on the browser, device, network, and external provider.
- The chatbot recognises a bounded set of places and question patterns. Unsupported places require more coverage.

Future work includes verified bus datasets, timetable-aware routing, pedestrian access to stops, measured reliability, database-backed transport ingestion, and scalable route search.

## Submission and presentation preparation

The handbook requires a working application, complete source code in a private GitHub repository, database schema/scripts, configuration instructions, dependency information, this README, and a short final presentation.

- [ ] Replace all team and member placeholders with registered details.
- [ ] Add the repository and presentation links.
- [ ] Confirm the private repository contains the final branches and commits.
- [ ] Verify the submitted version starts using the installation steps.
- [ ] Confirm credentials are excluded from the repository.
- [ ] Acknowledge external data, libraries, and AI assistance according to the organiser's policy.
- [ ] Prepare every member to explain the architecture, algorithm, assumptions, limitations, and their contributions.
- [ ] Submit before the organiser's deadline.

The presentation should cover the problem and significance, proposed solution, architecture, computational approach, working demonstration, validation, limitations, and future improvements.

The evaluation allocates 25 marks to problem-solving, 25 to technical complexity and engineering, 20 to functionality, 15 to innovation, 10 to technical defence, and 5 to presentation.

Prepared against the BuildX 0.1 Challenges Handbook, Challenge 04 on pages 11–12 and general development, submission, rules, and evaluation guidance on pages 25–31.
