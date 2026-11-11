import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db, sqlite } from '../src/lib/db/client.ts';
import { users } from '../src/lib/db/schema.ts';

const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;

if (!email || !password) {
  console.error('ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD are required.');
  process.exit(1);
}

const existing = await db.select().from(users).limit(1);
if (existing.length > 0) {
  console.log('Users already exist, skipping bootstrap.');
  sqlite.close();
  process.exit(0);
}

const hash = await bcrypt.hash(password, 12);
await db.insert(users).values({
  email,
  passwordHash: hash,
  role: 'admin',
});

console.log(`✓ Bootstrap admin created: ${email}`);
sqlite.close();
