-- Make staff email optional (UI no longer collects it)
ALTER TABLE "staffs" ALTER COLUMN "email" DROP NOT NULL;
