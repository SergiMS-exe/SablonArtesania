import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.SQLITE_DB_PATH ?? './data/sablon.sqlite',
  },
  strict: true,
  verbose: true,
});
