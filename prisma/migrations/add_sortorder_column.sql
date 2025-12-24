-- Migration: Add sortOrder column to WatchlistItem table
-- Run this if you get error: "The column `WatchlistItem.sortOrder` does not exist"

-- Add the sortOrder column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'WatchlistItem' AND column_name = 'sortOrder'
    ) THEN
        ALTER TABLE "WatchlistItem" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Create index for sorting if it doesn't exist
CREATE INDEX IF NOT EXISTS "WatchlistItem_userId_sortOrder_idx" ON "WatchlistItem"("userId", "sortOrder");
