import 'dotenv/config';
import { migrate } from 'drizzle-orm/libsql/migrator';
import bcrypt from 'bcryptjs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { db, sqlite } from '../src/lib/db/client.ts';
import {
  artisans,
  categories,
  products,
  productImages,
  users,
} from '../src/lib/db/schema.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

async function runMigrations(db) {
  await migrate(db, { migrationsFolder: resolve(root, 'drizzle') });
  console.log('[entrypoint] Migrations applied.');
}

async function bootstrapAdmin(db) {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!email || !password) {
    console.log('[entrypoint] No ADMIN_BOOTSTRAP_* set, skipping admin bootstrap.');
    return;
  }
  const existing = await db.select().from(users).limit(1);
  if (existing.length > 0) {
    console.log('[entrypoint] Users already exist, skipping bootstrap.');
    return;
  }
  const hash = await bcrypt.hash(password, 12);
  await db.insert(users).values({ email: email.toLowerCase(), passwordHash: hash, role: 'admin' });
  console.log(`[entrypoint] Bootstrap admin created: ${email}`);
}

async function seedIfEmpty(db) {
  const existing = await db.select({ id: products.id }).from(products).limit(1);
  if (existing.length > 0) {
    console.log('[entrypoint] Products already exist, skipping seed.');
    return;
  }
  const productsJson = JSON.parse(
    await readFile(resolve(root, 'src/data/products.json'), 'utf8'),
  );
  const collaboratorsJson = JSON.parse(
    await readFile(resolve(root, 'src/data/collaborators.json'), 'utf8'),
  );

  const artisanRows = await db
    .insert(artisans)
    .values({
      slug: 'sablon',
      name: 'El Sablón',
      specialty: 'Cuero artesanal',
      location: 'Asturias',
      shortBio: 'Taller de artesanía en cuero curtido al vegetal.',
      longBio:
        'Piezas únicas hechas a mano en cuero curtido al vegetal: bolsos, carteras, cinturones y más.',
      imageUrl: '/logo-sablon.webp',
      instagram: 'elsablonartesania',
      active: true,
      sortOrder: 0,
    })
    .onConflictDoNothing({ target: artisans.slug })
    .returning();

  for (const c of collaboratorsJson) {
    await db
      .insert(artisans)
      .values({
        slug: c.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, ''),
        name: c.name,
        specialty: c.specialty ?? null,
        location: c.location ?? null,
        shortBio: c.description ?? null,
        longBio: c.longDescription ?? null,
        imageUrl: c.image ?? null,
        instagram: c.instagram ?? null,
        active: true,
        sortOrder: artisanRows.length + 1,
      })
      .onConflictDoNothing({ target: artisans.slug });
  }

  const allArtisans = await db.select().from(artisans);
  const categorySlugs = new Set(productsJson.map((p) => p.category));
  const categoryLabels: Record<string, string> = {};
  for (const p of productsJson) {
    if (!categoryLabels[p.category]) categoryLabels[p.category] = p.categoryLabel;
  }
  for (const slug of categorySlugs) {
    await db
      .insert(categories)
      .values({ slug, name: categoryLabels[slug] ?? slug, sortOrder: 0 })
      .onConflictDoNothing({ target: categories.slug });
  }
  const allCategories = await db.select().from(categories);

  const normalizeSlug = (value: string) => value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  const findArtisan = (slug: string, name: string) => {
    const norm = normalizeSlug(slug);
    const normName = normalizeSlug(name);
    return allArtisans.find((artisan) =>
      artisan.slug === norm ||
      norm.includes(artisan.slug) ||
      artisan.slug.includes(norm) ||
      normalizeSlug(artisan.name) === normName,
    );
  };

  for (const p of productsJson) {
    const artisan = findArtisan(p.artisan, p.artisanName);
    const category = allCategories.find((c) => c.slug === p.category);
    if (!artisan || !category) continue;
    const slug = p.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const [inserted] = await db
      .insert(products)
      .values({
        slug,
        artisanId: artisan.id,
        categoryId: category.id,
        name: p.title,
        shortDescription: p.description,
        longDescription: p.longDescription,
        priceCents: null,
        currency: 'EUR',
        status: 'disponible',
        sortOrder: p.id,
      })
      .onConflictDoNothing({ target: products.slug })
      .returning();
    if (!inserted) continue;
    if (p.images?.length) {
      await db.insert(productImages).values(
        p.images.map((url, i) => ({
          productId: inserted.id,
          url,
          sortOrder: i,
        })),
      );
    }
  }
  console.log('[entrypoint] Seed completed.');
}

async function main() {
  await runMigrations(db);
  await bootstrapAdmin(db);
  await seedIfEmpty(db);

  sqlite.close();
  console.log('[entrypoint] Setup OK. Starting server…');
}

main().catch((err) => {
  console.error('[entrypoint] Failed:', err);
  process.exit(1);
});
