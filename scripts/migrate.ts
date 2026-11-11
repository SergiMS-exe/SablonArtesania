import 'dotenv/config';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { db, sqlite } from '../src/lib/db/client.ts';

await migrate(db, { migrationsFolder: './drizzle' });
sqlite.close();
console.log('Migrations applied.');
