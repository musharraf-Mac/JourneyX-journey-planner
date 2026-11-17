# Account, AI and actual transport integration

## Local PostgreSQL

Copy `.env.example` to `.env`. Choose a local password and use it in both POSTGRES_PASSWORD and DATABASE_URL (URL-encode special characters in the URL). Never commit .env. Then run:

```
docker compose up -d
npx prisma migrate dev --name initial
npx prisma generate
npm run dev
```

Alternatively point DATABASE_URL at an existing local PostgreSQL database. The schema is `prisma/schema.prisma` (Prisma's standard filename).

Guests can search and compare without authentication. Saving uses authenticated APIs, not browser storage. Register stores an scrypt password hash; login creates an expiring random session whose hash is stored in PostgreSQL. Cookies are HttpOnly, SameSite=Lax and Secure in production. Mutations check Origin. Logout invalidates the session. Existing browser-only saves are not automatically imported.

Email verification, password recovery, and distributed rate limiting are deployment follow-ups. Current throttles are per server process and reset on restart. Do not treat this as a completed production identity system.

## Groq

Set GROQ_API in .env. The default model is openai/gpt-oss-20b, served by Groq. Set GROQ_MODEL to use another chat model available to your Groq account. The key stays server-side. The assistant uses Groq for general app help. Route questions are answered directly from the bus planner using named stops or the selected journey, with disruptions applied. Bus route answers work without a Groq key. The app sends general help prompts to Groq and uses a built-in help response if the provider is unavailable.

## Bus data and map

- Bus 177 route reference: https://routemaster.lk/bus/177/
- NTC bus route maps: https://www.ntc.gov.lk/Bus_info/route_map.php
- Street-map tiles: https://operations.osmfoundation.org/policies/tiles/

Route 177 covers a subset of published areas between Kaduwela and Kollupitiya. JourneyX uses estimated travel metrics and approximate stop coordinates. The location control uses the browser's geolocation permission and stops watching when turned off or when the map unmounts. The app does not save passenger coordinates.

## Required next data steps

1. Obtain a licensed bus feed or official downloadable bus timetables and route-stop sequences. Record source URL, license, retrieval date, verification date and validity window.
2. Import directional Service/Trip/StopTime records. Seconds from service-day midnight allow times beyond 24:00. Apply operating days and date-specific exceptions in Asia/Colombo.
3. Geocode arbitrary start/end locations and ask a pedestrian routing provider for actual walkable paths to candidate stops. Save geometry, road instructions, distance, accessibility and source. Straight-line proximity must not imply walkability or bus service.
4. Join walking legs with verified service legs; check boarding permission, departure time and transfer buffers. Offer walking-only alternatives when no service is available. Never infer bus coverage from a road line.
5. Replace demo search with timetable-aware multi-criteria routing. AI explains deterministic results and citations; it must not generate the underlying services, fares or departures.

The schema supports these records, but importing feeds, pedestrian provider integration and timetable-aware routing are still pending. No invented live data has been seeded.
