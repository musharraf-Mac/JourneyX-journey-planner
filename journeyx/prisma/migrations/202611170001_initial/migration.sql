-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TransportMode" AS ENUM ('BUS', 'TRAIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateTable
CREATE TABLE "SavedJourney" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedJourney_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "retrievedAt" TIMESTAMP(3),
    "license" TEXT,

    CONSTRAINT "TransportSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accessible" BOOLEAN,

    CONSTRAINT "Stop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "routeNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "TransportMode" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Colombo',
    "operatingDays" INTEGER[],
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripException" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "runs" BOOLEAN NOT NULL,

    CONSTRAINT "TripException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StopTime" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "arrivalSeconds" INTEGER NOT NULL,
    "departureSeconds" INTEGER NOT NULL,
    "pickupAllowed" BOOLEAN NOT NULL DEFAULT true,
    "dropoffAllowed" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "StopTime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalkingLink" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "distanceMeters" INTEGER NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "instructions" JSONB NOT NULL,
    "geometry" JSONB NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "accessible" BOOLEAN,

    CONSTRAINT "WalkingLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedJourney_userId_from_to_priority_key" ON "SavedJourney"("userId", "from", "to", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "TransportSource_url_key" ON "TransportSource"("url");

-- CreateIndex
CREATE UNIQUE INDEX "Service_sourceId_routeNumber_mode_key" ON "Service"("sourceId", "routeNumber", "mode");

-- CreateIndex
CREATE UNIQUE INDEX "TripException_tripId_date_key" ON "TripException"("tripId", "date");

-- CreateIndex
CREATE INDEX "StopTime_stopId_idx" ON "StopTime"("stopId");

-- CreateIndex
CREATE UNIQUE INDEX "StopTime_tripId_sequence_key" ON "StopTime"("tripId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "WalkingLink_fromId_toId_key" ON "WalkingLink"("fromId", "toId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedJourney" ADD CONSTRAINT "SavedJourney_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "TransportSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripException" ADD CONSTRAINT "TripException_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StopTime" ADD CONSTRAINT "StopTime_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StopTime" ADD CONSTRAINT "StopTime_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "Stop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalkingLink" ADD CONSTRAINT "WalkingLink_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Stop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalkingLink" ADD CONSTRAINT "WalkingLink_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Stop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
