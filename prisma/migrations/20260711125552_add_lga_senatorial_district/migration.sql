-- AlterTable
ALTER TABLE "LGA" ADD COLUMN     "senatorialDistrict" TEXT;

-- CreateIndex
CREATE INDEX "LGA_senatorialDistrict_idx" ON "LGA"("senatorialDistrict");
