import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Priority:
// 1) PRISMA_ENV_FILE (e.g. .env.production via migrate scripts) — exclusive
// 2) .env.local (local Docker)
// 3) .env
if (process.env.PRISMA_ENV_FILE) {
  dotenv.config({ path: process.env.PRISMA_ENV_FILE, override: true });
} else {
  dotenv.config({ path: ".env.local" });
  dotenv.config();
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations must use DIRECT_URL (Supabase port 5432), not the pooler
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
});
