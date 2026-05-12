// Prisma config — carga .env.local primero, luego .env como fallback
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
