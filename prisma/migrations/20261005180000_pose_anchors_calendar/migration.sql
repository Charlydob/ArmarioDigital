CREATE TYPE "CalendarEntryType" AS ENUM ('PLANNED', 'WORN');

ALTER TABLE "Pose" ADD COLUMN "anchors" JSONB NOT NULL DEFAULT '{"head":0.1,"shoulders":0.23,"torso":0.4,"hips":0.54,"knees":0.76,"feet":0.95}';

CREATE TABLE "OutfitCalendarEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "outfitId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "CalendarEntryType" NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OutfitCalendarEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OutfitCalendarEntry_userId_date_key" ON "OutfitCalendarEntry"("userId", "date");
CREATE INDEX "OutfitCalendarEntry_userId_date_idx" ON "OutfitCalendarEntry"("userId", "date");
ALTER TABLE "OutfitCalendarEntry" ADD CONSTRAINT "OutfitCalendarEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OutfitCalendarEntry" ADD CONSTRAINT "OutfitCalendarEntry_outfitId_fkey" FOREIGN KEY ("outfitId") REFERENCES "Outfit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
