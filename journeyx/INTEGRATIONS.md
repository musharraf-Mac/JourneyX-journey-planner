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

Set GROQ_API in .env. The key stays server-side. The assistant uses Groq's OpenAI-compatible chat completions API with bounded output. No account credentials are sent to Groq. Questions and computed demo journey summaries are sent to Groq. The assistant is stateless and does not save chats. It recomputes the selected journey with validated mode and disruption inputs. Missing credentials produce a clear unavailable state, never a fake AI response.

## Actual transport: verified source discovery, not an imported live feed

Checked 2026-11-17:

- Official railway timetable search: https://eservices.railway.gov.lk/schedule/searchTrain.action
- Official railway timetable index: https://www.railway.gov.lk/web/index.php?Itemid=0&id=1024&lang=en&option=com_content&view=article
- NTC bus route maps: https://www.ntc.gov.lk/Bus_info/route_map.php
- RDMNS: https://www.rdmns.lk/

RDMNS describes live schedules and community alerts but its public landing page is not a documented API. The official timetable/map pages could not be retrieved through the research tool. No current bus stop sequences or dated train departures have been verified or imported. Existing routes remain explicitly simulated. Source links are available in the assistant.

## Required next data steps

1. Obtain a licensed feed or official downloadable timetable and route-stop sequences. Record source URL, license, retrieval date, verification date and validity window.
2. Import directional Service/Trip/StopTime records. Seconds from service-day midnight allow times beyond 24:00. Apply operating days and date-specific exceptions in Asia/Colombo.
3. Geocode arbitrary start/end locations and ask a pedestrian routing provider for actual walkable paths to candidate stops. Save geometry, road instructions, distance, accessibility and source. Straight-line proximity must not imply walkability or bus service.
4. Join walking legs with verified service legs; check boarding permission, departure time and transfer buffers. Offer walking-only alternatives when no service is available. Never infer bus coverage from a road line.
5. Replace demo search with timetable-aware multi-criteria routing. AI explains deterministic results and citations; it must not generate the underlying services, fares or departures.

The schema supports these records, but importing feeds, pedestrian provider integration and timetable-aware routing are still pending. No invented live data has been seeded.
