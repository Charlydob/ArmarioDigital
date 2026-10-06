CREATE TYPE "AiTryOnJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

ALTER TABLE "Outfit" ALTER COLUMN "poseId" DROP NOT NULL;
ALTER TABLE "Outfit" ADD COLUMN "realPhotoMediaId" TEXT;

CREATE TABLE "AiTryOnJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "outfitId" TEXT NOT NULL,
    "status" "AiTryOnJobStatus" NOT NULL DEFAULT 'QUEUED',
    "provider" TEXT NOT NULL,
    "providerJobId" TEXT,
    "inputHash" TEXT NOT NULL,
    "resultMediaId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "AiTryOnJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiTryOnJob_userId_inputHash_status_idx" ON "AiTryOnJob"("userId", "inputHash", "status");
CREATE INDEX "AiTryOnJob_outfitId_createdAt_idx" ON "AiTryOnJob"("outfitId", "createdAt");

ALTER TABLE "Outfit" ADD CONSTRAINT "Outfit_realPhotoMediaId_fkey" FOREIGN KEY ("realPhotoMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiTryOnJob" ADD CONSTRAINT "AiTryOnJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiTryOnJob" ADD CONSTRAINT "AiTryOnJob_outfitId_fkey" FOREIGN KEY ("outfitId") REFERENCES "Outfit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiTryOnJob" ADD CONSTRAINT "AiTryOnJob_resultMediaId_fkey" FOREIGN KEY ("resultMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
