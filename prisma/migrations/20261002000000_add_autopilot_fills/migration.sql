-- CreateTable: autopilot_fills
-- Tracks every AstrePilot bookmarklet activation for the application history dashboard

CREATE TABLE IF NOT EXISTS "autopilot_fills" (
    "id"           TEXT NOT NULL PRIMARY KEY,
    "profileId"    TEXT NOT NULL,
    "siteUrl"      TEXT NOT NULL,
    "company"      TEXT,
    "jobTitle"     TEXT,
    "fieldsTotal"  INTEGER NOT NULL,
    "fieldsFilled" INTEGER NOT NULL,
    "hasAiAnswers" BOOLEAN NOT NULL DEFAULT false,
    "filledAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "autopilot_fills_profileId_fkey"
        FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "autopilot_fills_profileId_idx" ON "autopilot_fills"("profileId");
CREATE INDEX IF NOT EXISTS "autopilot_fills_filledAt_idx"  ON "autopilot_fills"("filledAt");
