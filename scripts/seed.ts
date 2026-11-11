import 'dotenv/config';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { db, sqlite } from '../src/lib/db/client.ts';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  artisans,
  categories,
  products,
  productImages,
} from '../src/lib/db/schema.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

interface JsonProduct {
  id: number;
  artisan: string;
  artisanName: string;
  category: string;
  categoryLabel: string;
  title: string;
  description: string;
  longDescription: string;
  images: string[];
}

interface JsonCollaborator {
  id: number;
  name: string;
  specialty?: string;
  location?: string;
  description?: string;
  longDescription?: string;
  instagram?: string;
  image?: string;
}

async function main() {
  console.log('→ Running migrations…');
  await migrate(db, { migrationsFolder: resolve(root, 'drizzle') });

  console.log('→ Reading seed sources…');
  const productsJson = JSON.parse(
    await readFile(resolve(root, 'src/data/products.json'), 'utf8'),
  ) as JsonProduct[];
  const collaboratorsJson = JSON.parse(
    await readFile(resolve(root, 'src/data/collaborators.json'), 'utf8'),
  ) as JsonCollaborator[];

  // Idempotent: solo sembramos si no hay productos.
  const existing = await db.select().from(products).limit(1);
  if (existing.length > 0) {
    console.log('✓ Products already exist, skipping seed.');
    sqlite.close();
    return;
  }

  console.log('→ Inserting artisans…');
  const artisanRows = await db
    .insert(artisans)
    .values({
      slug: 'sablon',
      name: 'El Sablón',
      specialty: 'Cuero artesanal',
      location: 'Asturias',
      shortBio: 'Taller de artesanía en cuero curtido al vegetal.',
      longBio:
        'Piezas únicas hechas a mano en cuero curtido al vegetal: bolsos, carteras, cinturones y más. Cada pieza desarrolla una pátina única con el uso.',
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

  console.log('→ Inserting categories…');
  const categorySlugs = new Set(productsJson.map((p) => p.category));
  const categoryLabels: Record<string, string> = {};
  for (const p of productsJson) {
    if (!categoryLabels[p.category]) categoryLabels[p.category] = p.categoryLabel;
  }
  for (const slug of categorySlugs) {
    await db
      .insert(categories)
      .values({
        slug,
        name: categoryLabels[slug] ?? slug,
        sortOrder: 0,
      })
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

  console.log('→ Inserting products + images…');
  for (const p of productsJson) {
    const artisan = findArtisan(p.artisan, p.artisanName);
    const category = allCategories.find((c) => c.slug === p.category);
    if (!artisan || !category) {
      console.warn(`  ! skipping product ${p.id} (${p.title}): no artisan or category`);
      continue;
    }
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

  console.log('✓ Seed done.');
  sqlite.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
