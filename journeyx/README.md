# JourneyX application

**Cortex Crew — BuildX 0.1, Challenge 04**

The complete hackathon submission documentation, team-member placeholders, requirements mapping, architecture, setup, dataset acknowledgements, validation, and demo flow are in the [repository README](../README.md).

Run commands in this directory. For an existing configured checkout:

~~~powershell
npm ci
npx prisma generate
npx prisma migrate deploy
npm run dev
~~~

For a fresh setup, follow the environment and database instructions in the repository README before running migrations.

~~~powershell
node --experimental-strip-types --test tests/network.test.mjs
npm run build
~~~

[Additional integration notes](INTEGRATIONS.md) describe accounts, Groq, and future transport ingestion.
