-- Initial local schema for the internal career manager database.
-- This schema is owned by the application and is not the EA FC game save.
CREATE TABLE "Career" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "currentSeason" TEXT NOT NULL,
    "controlledClubId" TEXT,
    "randomSeed" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    CONSTRAINT "Career_controlledClubId_fkey" FOREIGN KEY ("controlledClubId") REFERENCES "Club" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Club" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "careerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "reputation" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL,
    CONSTRAINT "Club_careerId_fkey" FOREIGN KEY ("careerId") REFERENCES "Career" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "careerId" TEXT NOT NULL,
    "currentClubId" TEXT,
    "name" TEXT NOT NULL,
    "birthDate" DATETIME,
    "overall" INTEGER,
    "potential" INTEGER,
    "heightCm" INTEGER,
    "weightKg" INTEGER,
    "provenanceKind" TEXT NOT NULL,
    "provenanceSource" TEXT NOT NULL,
    "provenanceRecordedAt" DATETIME NOT NULL,
    CONSTRAINT "Player_careerId_fkey" FOREIGN KEY ("careerId") REFERENCES "Career" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Player_currentClubId_fkey" FOREIGN KEY ("currentClubId") REFERENCES "Club" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Fixture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "careerId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "homeClubId" TEXT NOT NULL,
    "awayClubId" TEXT NOT NULL,
    "kickoffAt" DATETIME NOT NULL,
    "timeZone" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "provenanceKind" TEXT,
    "provenanceSource" TEXT,
    "provenanceRecordedAt" DATETIME,
    CONSTRAINT "Fixture_careerId_fkey" FOREIGN KEY ("careerId") REFERENCES "Career" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Fixture_homeClubId_fkey" FOREIGN KEY ("homeClubId") REFERENCES "Club" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Fixture_awayClubId_fkey" FOREIGN KEY ("awayClubId") REFERENCES "Club" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "FinanceEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "careerId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "minorUnits" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "reference" TEXT,
    "provenanceKind" TEXT NOT NULL,
    "provenanceSource" TEXT NOT NULL,
    "provenanceRecordedAt" DATETIME NOT NULL,
    CONSTRAINT "FinanceEntry_careerId_fkey" FOREIGN KEY ("careerId") REFERENCES "Career" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FinanceEntry_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Career_name_idx" ON "Career"("name");
CREATE UNIQUE INDEX "Club_careerId_name_key" ON "Club"("careerId", "name");
CREATE INDEX "Club_careerId_idx" ON "Club"("careerId");
CREATE INDEX "Player_careerId_currentClubId_idx" ON "Player"("careerId", "currentClubId");
CREATE INDEX "Fixture_careerId_kickoffAt_idx" ON "Fixture"("careerId", "kickoffAt");
CREATE INDEX "FinanceEntry_careerId_occurredAt_idx" ON "FinanceEntry"("careerId", "occurredAt");
CREATE INDEX "FinanceEntry_clubId_occurredAt_idx" ON "FinanceEntry"("clubId", "occurredAt");
