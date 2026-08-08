import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Prefer local Docker DB (.env.local), same as Backend/src/config/env.js
dotenv.config({ path: ".env.local" });
dotenv.config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
});
