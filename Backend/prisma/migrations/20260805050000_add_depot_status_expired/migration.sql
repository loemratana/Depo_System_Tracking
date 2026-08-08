-- DepotStatus: expired
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'DepotStatus' AND e.enumlabel = 'expired'
  ) THEN
    ALTER TYPE "DepotStatus" ADD VALUE 'expired';
  END IF;
END $$;
