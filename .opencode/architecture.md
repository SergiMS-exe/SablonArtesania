# Architecture — Sablón Artesanía

## Runtime

```text
Browser
  │ same-origin HTML and HTTP requests
  ▼
Astro SSR / Node.js 26 (single application)
  ├── public pages and admin pages
  ├── /api/public/* and /api/admin/* route handlers
  ├── middleware: migrations, session checks, aggregate page views
  ├── Drizzle ORM + @libsql/client
  │       └── SQLite file: SQLITE_DB_PATH
  ├── /media/* backed by MEDIA_DIR
  └── Telegram Bot API (optional inquiry notifications)
```

The database connection and secrets are server-only. Admin API routes are protected by the Astro middleware and signed httpOnly session cookie. Public pages and handlers read only published records.

## Deployment and persistence

- Deployment configuration is in this repo: `Dockerfile` and `docker-compose.yml`.
- One `web` container; no separate API or database container.
- Docker mounts `data` at `/app/data` for SQLite and `media` at `/app/media` for uploads.
- Run one app instance. SQLite is not configured for horizontal replicas.
- Back up the SQLite file and media volume independently. Use `VACUUM INTO` for a consistent SQLite copy while running.
- The old `sablon-api` / Postgres work is not part of the active deployment. No PostgreSQL-to-SQLite import is automatic.

## Database model

```text
artisan 1 ── N product N ── 1 category
                   │
                   └── 1 ── N product_image

user       admin accounts
inquiry    standalone consultation (no product FK)
market     calendar events
page_view  daily page/path counters
```

Physical tables and fields are defined in `src/lib/db/names.ts` and `src/lib/db/schema.ts`.

| Table | Purpose and key fields |
|---|---|
| `user` | Admin credentials and role; soft delete with `deleted_at`. |
| `artisan` | Public artisan profile and `active`; soft delete. |
| `category` | Slug, name, `active`, sort order; soft delete. |
| `product` | Artisan/category IDs, descriptions, price, status, `active`; soft delete. |
| `product_image` | Product image URL, sort order and alt text; soft delete. Files are retained for restoration. |
| `inquiry` | Name, email, phone, message, type, status, created time; soft delete. No product ID or origin. |
| `market` | Location, start/end dates, schedule, optional Instagram URL, active and sort order. Physical delete; no `deleted_at`. |
| `page_view` | Unique day + route and aggregate view count; soft delete. Stores no IP, cookies, user-agent or referrer. |

Product status values: `disponible`, `vendido`, `oculto`. Inquiry type: `contact`, `product`; inquiry status: `new`, `read`, `archived`.

Public products must be active, not soft-deleted, `disponible`, and attached to active/non-deleted artisan and category records. Soft-deleting or deactivating an artisan/category hides dependent products without deleting them.

## Migration strategy

There is one generated SQLite baseline in `drizzle/`. It creates the final singular schema directly, including active flags and soft delete, with the inquiry relation/origin columns omitted. The local database has already been migrated to this final schema. **Do not recreate the database or change the baseline timestamp casually**: the existing local SQLite file contains migration history and may contain user data. Ask before changing the migration strategy.

For schema edits, update `src/lib/db/schema.ts` and `src/lib/db/names.ts`, then run `npm run db:generate`. Review the generated SQL; verify `inquiry` remains free of product/origin fields and that no migration removes user data unexpectedly.

## HTTP surfaces

### Public

- `GET /api/public/products` and `GET /api/public/products/{slug}`
- `GET /api/public/categories`, `/api/public/artisans`, `/api/public/markets`
- `POST /api/public/inquiries`

### Admin (signed session required)

- Auth: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
- CRUD: `/api/admin/products`, `/categories`, `/artisans`, `/markets`, `/inquiries`
- Product state: `/api/admin/products/{id}/status`
- Images: `/api/admin/products/{id}/images`, `/api/admin/product-images/{id}` and `/reorder`
- Markets are the only resource whose admin DELETE physically removes a row. Other deletions set `deleted_at` and expose restore actions.

## Market and inquiry behavior

- `/admin/mercados` edits calendar records in SQLite. `/encuentranos` queries those records at runtime; never load markets from JSON.
- `ProductInquiryForm` sends type `product` and includes the product name in the message text. No database product relationship is created.
- `/contacto` sends type `contact`.
- Both forms save to `inquiry`; Telegram notifications use `TELEGRAM_BOT_TOKEN` and one or more `TELEGRAM_CHAT_IDS`.
