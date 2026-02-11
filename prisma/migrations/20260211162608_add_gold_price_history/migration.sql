-- CreateTable
CREATE TABLE "gold_price_history" (
    "id" SERIAL NOT NULL,
    "goldType" TEXT NOT NULL,
    "buyPrice" DOUBLE PRECISION NOT NULL,
    "sellPrice" DOUBLE PRECISION NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gold_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gold_price_history_goldType_fetchedAt_idx" ON "gold_price_history"("goldType", "fetchedAt");
