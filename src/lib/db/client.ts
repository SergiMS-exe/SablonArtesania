import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.ts';

const databasePath = resolve(process.env.SQLITE_DB_PATH ?? './data/sablon.sqlite');
mkdirSync(dirname(databasePath), { recursive: true });

export const sqlite = createClient({
  url: pathToFileURL(databasePath).href,
  timeout: 5000,
});

export const db = drizzle(sqlite, { schema });
export { schema };
export type DB = typeof db;
