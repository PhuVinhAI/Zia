/**
 * Drizzle Kit Config - Cho migrations và Drizzle Studio
 * Chạy: bun drizzle-kit studio
 */
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/infrastructure/database/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "data/bot.db",
  },
});
