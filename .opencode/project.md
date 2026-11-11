# Project context — Sablón Artesanía

## Purpose

Asturian artisan storefront with an administration panel. Admins maintain products, categories, artisans, calendar markets and inquiries. Visitors can browse unique pieces and submit a consultation; there is no checkout or online payment.

## Stack

- Astro 7 SSR on Node.js 26 LTS, React 19 and Tailwind CSS 4.
- SQLite through Drizzle ORM and `@libsql/client`.
- Telegram Bot API for optional inquiry notifications.
- Local/container media storage in a persistent volume.

The app is a full-stack monolith. **Do not add a separate FastAPI service, PostgreSQL, or a dependency on `sablon-deploy`** without first discussing the architectural change.

## Important rules

- Browser code must never connect to SQLite. Database access belongs in Astro server code (`src/pages/*.astro`, `src/pages/api/*`, middleware and server libraries).
- Table, column and index identifiers are centralized in `src/lib/db/names.ts`; schema definitions are in `src/lib/db/schema.ts`.
- Physical SQLite table names are singular: `user`, `artisan`, `category`, `product`, `product_image`, `inquiry`, `market`, `page_view`.
- `category` and `product` have an `active` flag. Products also have the separate `disponible | vendido | oculto` status.
- Soft delete uses nullable `deleted_at` everywhere except `market`. Market `DELETE` is intentionally physical. Keep restore behavior in admin for soft-deleted records.
- `inquiry` has **no product foreign key and no `origin` column**. `type` is `contact | product`; for a piece inquiry, its name is plain text in the message.
- The market calendar reads SQLite. `src/data/markets.json` is not a runtime source and must not be used to seed markets.
- The current SQLite migration chain is a single baseline in `drizzle/`. Ask before adding incremental migration files or changing the baseline strategy.
- Do not commit `.env`, SQLite files, uploads or secrets. Database and media backups are separate.

## Useful commands

```sh
npm install
npm run db:migrate
npm run db:bootstrap
npm run db:seed
npm run dev
npm run build
```

`npm run db:bootstrap` needs `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD`. Development middleware also applies migrations on the first request. Production startup applies migrations, bootstraps the admin and seeds the initial catalog.

## Environment

Key variables: `SQLITE_DB_PATH`, `SESSION_PASSWORD`, `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_IDS` (comma-separated; `TELEGRAM_CHAT_ID` is supported for compatibility), and `MEDIA_DIR`.

See `README.md` for current setup, endpoints, backups and operational instructions. See `PLAN_ADMIN_ESCAPARATE.md` for the current product/data model and admin workflows.
