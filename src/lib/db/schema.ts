import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { DB_COLUMNS as C, DB_INDEXES as I, DB_TABLES as T } from './names.ts';

export const productStatus = ['disponible', 'vendido', 'oculto'] as const;
export const inquiryType = ['contact', 'product'] as const;
export const inquiryStatus = ['new', 'read', 'archived'] as const;

export const users = sqliteTable(T.users, {
  id: integer(C.users.id).primaryKey({ autoIncrement: true }),
  email: text(C.users.email).notNull().unique(),
  passwordHash: text(C.users.passwordHash).notNull(),
  role: text(C.users.role).notNull().default('admin'),
  createdAt: integer(C.users.createdAt, { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deletedAt: integer(C.users.deletedAt, { mode: 'timestamp' }),
});

export const artisans = sqliteTable(T.artisans, {
  id: integer(C.artisans.id).primaryKey({ autoIncrement: true }),
  slug: text(C.artisans.slug).notNull().unique(),
  name: text(C.artisans.name).notNull(),
  specialty: text(C.artisans.specialty),
  location: text(C.artisans.location),
  shortBio: text(C.artisans.shortBio),
  longBio: text(C.artisans.longBio),
  imageUrl: text(C.artisans.imageUrl),
  instagram: text(C.artisans.instagram),
  active: integer(C.artisans.active, { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer(C.artisans.sortOrder).notNull().default(0),
  createdAt: integer(C.artisans.createdAt, { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer(C.artisans.updatedAt, { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deletedAt: integer(C.artisans.deletedAt, { mode: 'timestamp' }),
});

export const categories = sqliteTable(T.categories, {
  id: integer(C.categories.id).primaryKey({ autoIncrement: true }),
  slug: text(C.categories.slug).notNull().unique(),
  name: text(C.categories.name).notNull(),
  active: integer(C.categories.active, { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer(C.categories.sortOrder).notNull().default(0),
  createdAt: integer(C.categories.createdAt, { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deletedAt: integer(C.categories.deletedAt, { mode: 'timestamp' }),
});

export const products = sqliteTable(T.products, {
  id: integer(C.products.id).primaryKey({ autoIncrement: true }),
  slug: text(C.products.slug).notNull().unique(),
  artisanId: integer(C.products.artisanId).notNull().references(() => artisans.id, { onDelete: 'restrict' }),
  categoryId: integer(C.products.categoryId).notNull().references(() => categories.id, { onDelete: 'restrict' }),
  name: text(C.products.name).notNull(),
  shortDescription: text(C.products.shortDescription).notNull(),
  longDescription: text(C.products.longDescription).notNull(),
  priceCents: integer(C.products.priceCents),
  currency: text(C.products.currency).notNull().default('EUR'),
  status: text(C.products.status, { enum: productStatus }).notNull().default('disponible'),
  active: integer(C.products.active, { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer(C.products.sortOrder).notNull().default(0),
  createdAt: integer(C.products.createdAt, { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer(C.products.updatedAt, { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deletedAt: integer(C.products.deletedAt, { mode: 'timestamp' }),
});

export const productImages = sqliteTable(T.productImages, {
  id: integer(C.productImages.id).primaryKey({ autoIncrement: true }),
  productId: integer(C.productImages.productId).notNull().references(() => products.id, { onDelete: 'cascade' }),
  url: text(C.productImages.url).notNull(),
  sortOrder: integer(C.productImages.sortOrder).notNull().default(0),
  altText: text(C.productImages.altText),
  deletedAt: integer(C.productImages.deletedAt, { mode: 'timestamp' }),
});

export const inquiries = sqliteTable(T.inquiries, {
  id: integer(C.inquiries.id).primaryKey({ autoIncrement: true }),
  name: text(C.inquiries.name).notNull(),
  email: text(C.inquiries.email).notNull(),
  phone: text(C.inquiries.phone),
  message: text(C.inquiries.message).notNull(),
  type: text(C.inquiries.type, { enum: inquiryType }).notNull(),
  status: text(C.inquiries.status, { enum: inquiryStatus }).notNull().default('new'),
  createdAt: integer(C.inquiries.createdAt, { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deletedAt: integer(C.inquiries.deletedAt, { mode: 'timestamp' }),
});

export const markets = sqliteTable(T.markets, {
  id: integer(C.markets.id).primaryKey({ autoIncrement: true }),
  location: text(C.markets.location).notNull(),
  startDate: text(C.markets.startDate).notNull(),
  endDate: text(C.markets.endDate).notNull(),
  schedule: text(C.markets.schedule).notNull().default('11:00 — 15:00'),
  instagramUrl: text(C.markets.instagramUrl),
  active: integer(C.markets.active, { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer(C.markets.sortOrder).notNull().default(0),
  createdAt: integer(C.markets.createdAt, { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer(C.markets.updatedAt, { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  uniqueIndex(I.marketsDateLocationUnique).on(table.startDate, table.endDate, table.location),
]);

export const pageViews = sqliteTable(T.pageViews, {
  id: integer(C.pageViews.id).primaryKey({ autoIncrement: true }),
  day: text(C.pageViews.day).notNull(),
  path: text(C.pageViews.path).notNull(),
  views: integer(C.pageViews.views).notNull().default(0),
  deletedAt: integer(C.pageViews.deletedAt, { mode: 'timestamp' }),
}, (table) => [
  uniqueIndex(I.pageViewsDayPathUnique).on(table.day, table.path),
]);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Artisan = typeof artisans.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;
export type Inquiry = typeof inquiries.$inferSelect;
export type User = typeof users.$inferSelect;
