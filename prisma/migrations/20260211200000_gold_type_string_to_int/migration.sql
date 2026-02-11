-- Step 1: Add temporary integer columns
ALTER TABLE "gold_transactions" ADD COLUMN "goldType_new" INTEGER;
ALTER TABLE "gold_price_history" ADD COLUMN "goldType_new" INTEGER;

-- Step 2: Convert existing string data to integers
UPDATE "gold_transactions" SET "goldType_new" = CASE
  WHEN "goldType" = 'gram' THEN 1
  WHEN "goldType" = 'ceyrek' THEN 2
  WHEN "goldType" = 'yarim' THEN 3
  WHEN "goldType" = 'cumhuriyet' THEN 4
END;

UPDATE "gold_price_history" SET "goldType_new" = CASE
  WHEN "goldType" = 'gram' THEN 1
  WHEN "goldType" = 'ceyrek' THEN 2
  WHEN "goldType" = 'yarim' THEN 3
  WHEN "goldType" = 'cumhuriyet' THEN 4
END;

-- Step 3: Drop old indexes
DROP INDEX IF EXISTS "gold_transactions_goldType_idx";
DROP INDEX IF EXISTS "gold_price_history_goldType_fetchedAt_idx";

-- Step 4: Drop old column and rename new one
ALTER TABLE "gold_transactions" DROP COLUMN "goldType";
ALTER TABLE "gold_transactions" RENAME COLUMN "goldType_new" TO "goldType";
ALTER TABLE "gold_transactions" ALTER COLUMN "goldType" SET NOT NULL;

ALTER TABLE "gold_price_history" DROP COLUMN "goldType";
ALTER TABLE "gold_price_history" RENAME COLUMN "goldType_new" TO "goldType";
ALTER TABLE "gold_price_history" ALTER COLUMN "goldType" SET NOT NULL;

-- Step 5: Recreate indexes
CREATE INDEX "gold_transactions_goldType_idx" ON "gold_transactions"("goldType");
CREATE INDEX "gold_price_history_goldType_fetchedAt_idx" ON "gold_price_history"("goldType", "fetchedAt");
