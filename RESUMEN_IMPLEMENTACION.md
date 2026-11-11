# Resumen de implementación — Sablón Artesanía

> Documento detallado de todo lo construido en la migración del escaparate estático al monolito dinámico con panel admin.

> **Actualización posterior:** esta narración recoge la primera versión, que usaba Postgres. La implementación vigente se ha pasado a SQLite con `@libsql/client`, añade el CRUD de mercados y las métricas agregadas de páginas vistas; la arquitectura actual y operación están descritas en `README.md`.

## 1. Contexto y decisión arquitectónica

Se partía del `PLAN_ADMIN_ESCAPARATE.md` (escaparate dinámico + admin) que proponía **dos repos** (`SablonArtesania` + `sablon-api` en FastAPI) y **tres contenedores** (web, api, db) con proxy SSR.

Tras revisar el plan y el repo se concluyó que para el alcance real (**8 productos, 1 artesano, sin pagos, sin OAuth, sin móvil**) esa arquitectura era desproporcionada. Se aprobó pivotar a un **monolito** con Astro SSR nativo + Postgres en Docker + Drizzle ORM, manteniendo los requisitos funcionales al 100% y reduciendo tiempo estimado de **7-8 días a 4**.

Criterios de la decisión:

- Astro ya soporta endpoints SSR nativos (`src/pages/api/*.ts`) — no hace falta FastAPI.
- Cookie same-origin elimina proxy SSR, `INTERNAL_API_URL` y CORS.
- Misma BD que el plan original (Postgres), solo se mueve del repo `sablon-api` a este repo.
- Drizzle sobre SQLAlchemy porque todo el código es TS, mejor DX, migraciones declarativas.

## 2. Stack final

| Capa | Tecnología |
| --- | --- |
| Framework | Astro 5 con `output: 'server'` |
| Runtime | `@astrojs/node@9.4.6` en modo `standalone` (Node 22) |
| UI | React 19 (islas interactivas) + Tailwind CSS 4 |
| Lenguaje | TypeScript (modo estricto) |
| ORM | Drizzle ORM 0.45 + `postgres` (postgres.js) 3.4 |
| BD | Postgres 16 |
| Auth | Cookie firmada con HMAC-SHA256 (`SESSION_PASSWORD`), bcryptjs para passwords |
| Uploads | `node:fs/promises` + endpoint nativo Astro + servicio de streaming para `/media/*` |
| Migraciones | drizzle-kit |
| Contenedores | `db` (postgres:16-alpine) + `web` (node:22-alpine standalone) |
| Volúmenes | `pgdata` (BD), `media` (imágenes) |

## 3. Arquitectura resultante

```
┌──────────────────────────────────────────────────────────┐
│                SablonArtesania (1 repo)                  │
│        Astro 5 · output:'server' · @astrojs/node        │
│                                                          │
│  /productos       /admin/*       ◀── páginas SSR         │
│  /api/public/*    /api/admin/*   ◀── endpoints nativos   │
│  /media/*                       ◀── streaming de uploads│
│                                                          │
│  Drizzle · postgres.js · bcryptjs · cookie firmada HMAC  │
└──────────────────────────────────────────────────────────┘
                            │
                            ▼
                  ┌──────────────────────┐
                  │ Postgres 16 (db)     │  volumen pgdata
                  └──────────────────────┘
                  /app/media/            │  volumen media
```

Una sola imagen Docker, dos servicios runtime, sin nginx interno.

## 4. Fases ejecutadas (resumen)

| Fase | Resultado |
| --- | --- |
| 1 — Scaffold | `output:'server'`, adapter Node, Drizzle, compose, Dockerfile |
| 2 — Schema + seed | `schema.ts` con 6 tablas + 3 enums, migración `0000`, `seed.ts` idempotente |
| 3 — Auth | `auth.ts` (cookie firmada), `middleware.ts`, `login.astro`, `api/auth/*` |
| 4 — Endpoints públicos | `categories`, `artisans`, `products`, `products/[slug]`, `inquiries` (con Telegram) |
| 5 — Endpoints admin | CRUD completo de categorías, artesanos, productos; status rápido; upload/reorder/delete de imágenes; inquiries inbox |
| 6 — UI admin | Dashboard, artesanos, categorías, productos (lista + alta + edición), consultas |
| 7 — Front público | `/productos` desde BD, `/productos/[slug]` con galería + formulario de consulta |
| 8 — Empaquetado | entrypoint, README, smoke test |

## 5. Detalle por fase

### Fase 1 — Scaffold

Instaladas las dependencias nuevas:

- `@astrojs/node@9.4.6` (versión compatible con Astro 5.18)
- `drizzle-orm`, `postgres`
- `bcryptjs`, `@types/bcryptjs`
- `iron-session` instalado pero **no usado** (se optó por cookie firmada casera, suficiente y sin overhead)
- `drizzle-kit`, `tsx`, `dotenv`

Archivos creados:

- `astro.config.mjs` → `output: 'server'`, `adapter: node({ mode: 'standalone' })`
- `drizzle.config.ts` → apunta a `src/lib/db/schema.ts`, salida `drizzle/`
- `docker-compose.yml` → servicios `db` y `web`, volúmenes `pgdata` y `media`, healthcheck de Postgres
- `Dockerfile` → multi-stage, build con `npm run build`, runner Node 22 con healthcheck `wget`
- `.env.example` → reescrito con `POSTGRES_*`, `SESSION_PASSWORD`, `ADMIN_BOOTSTRAP_*`, `TELEGRAM_*`, `MEDIA_DIR`, `WEB_PORT`
- `package.json` → nuevos scripts: `start`, `db:generate`, `db:migrate`, `db:seed`, `db:bootstrap`

### Fase 2 — Modelo de datos + seed

`src/lib/db/schema.ts` declara 6 tablas y 3 enums:

```ts
productStatus = ['disponible', 'vendido', 'oculto']
inquiryType   = ['contact', 'product']
inquiryStatus = ['new', 'read', 'archived']
```

Tablas: `users`, `artisans`, `categories`, `products`, `productImages`, `inquiries`.

`scripts/migrate.ts` aplica las migraciones generadas por drizzle-kit.

`scripts/seed.ts` lee `src/data/products.json` y `src/data/collaborators.json` y los inserta en BD. **Es idempotente**: si ya hay productos, no hace nada. Mapea artesanos con heurística de slug.

`scripts/bootstrap-admin.ts` crea el primer admin desde `ADMIN_BOOTSTRAP_EMAIL`/`ADMIN_BOOTSTRAP_PASSWORD` si la tabla `users` está vacía.

### Fase 3 — Autenticación

`src/lib/auth.ts` implementa sesión con cookie firmada:

- `encodeSession({ userId, email, role })` → token `<base64url(json)>.<HMAC-SHA256>`
- `decodeSession(token)` → verifica firma con `timingSafeEqual`, valida `exp`
- TTL 14 días
- Cookie `sablon_session`, `HttpOnly`, `SameSite=Lax`, `Secure` en producción

`src/middleware.ts` protege:

- `/admin/*` (páginas) → redirige a `/admin/login?next=...` si no hay sesión
- `/api/admin/*` (endpoints) → responde 401 JSON

`/admin/login` se considera público.

`src/env.d.ts` declara `App.Locals.user` para tipado.

`src/pages/admin/login.astro` muestra formulario que postea a `/api/auth/login`.

Endpoints:

- `src/pages/api/auth/login.ts` — JSON o form-data, compara con bcryptjs, emite cookie
- `src/pages/api/auth/logout.ts` — borra cookie
- `src/pages/api/auth/me.ts` — devuelve sesión o `{ authenticated: false }`

`src/lib/server-utils.ts` exporta `getSessionUser`, `requireSessionUser`, `jsonResponse` (reutilizado en todos los endpoints).

### Fase 4 — Endpoints públicos

`src/lib/telegram.ts` con `sendTelegram({ text })` y `formatContactInquiry(...)` (HTML escapado, incluye nombre, email, teléfono, pieza, mensaje, origen).

`src/lib/storage.ts` con `saveUpload(file, subdir)` (valida tipo MIME permitido `image/{jpeg,png,webp,gif,avif}`, máx 5 MB, genera nombre aleatorio) y `removeUpload(url)`.

`src/pages/media/[...path].ts` — endpoint que sirve archivos desde `MEDIA_DIR` con soporte de `Range` (HTTP 206) y `cache-control: public, max-age=86400`.

Endpoints:

- `GET /api/public/categories` → todas las categorías
- `GET /api/public/artisans` → solo artesanos activos
- `GET /api/public/products` → filtros `status`, `category`, `artisan`, con `images[]`
- `GET /api/public/products/{slug}` → ficha (excluye `oculto`), incluye galería y artesano/categoría
- `POST /api/public/inquiries` → guarda inquiry, dispara Telegram en background

`src/pages/contacto.astro` actualizado para postear a `/api/public/inquiries` (antes dependía de `PUBLIC_CONTACT_ENDPOINT` que ya no existe).

### Fase 5 — Endpoints admin

CRUD completo de las tres entidades y sub-recursos:

| Recurso | Endpoints |
| --- | --- |
| Categorías | `GET/POST /api/admin/categories`, `PATCH/DELETE /api/admin/categories/{id}` |
| Artesanos | `GET/POST /api/admin/artisans`, `PATCH/DELETE /api/admin/artisans/{id}` |
| Productos | `GET/POST /api/admin/products`, `GET/PATCH/DELETE /api/admin/products/{id}` |
| Status rápido | `PATCH /api/admin/products/{id}/status` |
| Imágenes producto | `POST /api/admin/products/{id}/images` (multipart), `DELETE /api/admin/product-images/{id}`, `PATCH /api/admin/product-images/{id}/reorder` |
| Consultas | `GET /api/admin/inquiries`, `PATCH /api/admin/inquiries/{id}/status` |
| Media | `POST /api/admin/media` (multipart, ≤ 5 MB) |

Reglas implementadas:

- DELETE de categoría/artisan bloqueado (409) si hay productos asociados.
- Slug autogenerado único (sufijo `-2`, `-3`, ...) en POST y en PATCH cuando cambia el nombre.
- Subida de imágenes escribe en `MEDIA_DIR/products/<timestamp>-<rand>.{ext}` y devuelve URL pública `/media/products/...`.
- DELETE de imagen borra también el archivo en disco vía `removeUpload`.
- `inquiries` notifica Telegram en background sin bloquear la respuesta HTTP.

### Fase 6 — UI admin

`src/layouts/AdminShell.astro` — layout común con cabecera walnut-deep, navegación entre secciones (Dashboard / Productos / Artesanos / Categorías / Consultas), botón "Salir" y enlace "Ver web".

Páginas:

- `src/pages/admin/index.astro` — dashboard: 4 contadores (disponibles, vendidos, ocultos, consultas nuevas), listado de últimas 5 consultas, accesos rápidos.
- `src/pages/admin/categorias.astro` — formulario inline de alta + listado con orden y borrado. JS mínimo que hace `POST/PATCH/DELETE` a la API.
- `src/pages/admin/artesanos/index.astro` — alta con todos los campos + listado con orden/activo y borrado.
- `src/pages/admin/productos/index.astro` — tabla con slug, precio, artesano, categoría, estado (badge de color).
- `src/pages/admin/productos/nuevo.astro` — pasa artesanos/categorías al `ProductForm`.
- `src/pages/admin/productos/[id].astro` — edición, lee el producto y sus imágenes para precargar el formulario.
- `src/pages/admin/consultas.astro` — inbox con filtros (Todas / Nuevas / Archivadas / De pieza / Generales), botones "Marcar leída" / "Archivar" / "Reabrir".

`src/components/admin/ProductForm.tsx` (React island, `client:load`):

- Campos: nombre, descripciones corta/larga, precio (€), moneda, artesano, categoría, orden, estado.
- Botones: Guardar, Marcar vendido (en edición), Eliminar pieza (en edición).
- Sección de imágenes (solo en edición): upload múltiple, mover ←/→ (sincroniza `sortOrder` vía API), eliminar (con confirmación), marcado "Principal" en la primera.
- Mensajes de éxito/error inline.

### Fase 7 — Front público

`src/pages/productos.astro` ahora lee de la BD:

- `disponible` por defecto
- `imagen` desde `product_images` ordenadas por `sortOrder`
- Filtros por categoría reescritos: ahora son `slug` en vez de valores hardcoded
- Pasa los datos al `ItemCard`

`src/components/ItemCard.tsx` rediseñado:

- Recibe `{ slug, name, shortDescription, artisan: {slug, name}, category: {slug, name}, priceCents, currency, images }`
- Ahora es un `<a href="/productos/{slug}">` (antes abría un modal)
- Muestra precio orientativo si existe
- Indicador de múltiples imágenes

`src/pages/productos/[slug].astro` (nueva ficha):

- Lee producto + galería desde BD (ocultos no se muestran)
- Muestra precio orientativo con su moneda
- Si está vendido, muestra aviso y formulario apuntando al general
- Galería con thumbnails clicables que actualizan la imagen principal (JS inline)
- Inserta `ProductInquiryForm` si está disponible

`src/components/ProductInquiryForm.tsx` — formulario React que postea a `/api/public/inquiries` con `type: 'product'`; el nombre de la pieza viaja dentro del mensaje, sin FK ni columna `origin`.

`src/components/Header.astro` ahora muestra enlace "Admin" (desktop y móvil) si `Astro.locals.user` existe.

### Fase 8 — Empaquetado

`scripts/entrypoint.ts` ejecuta al arrancar:

1. Espera a que Postgres responda (hasta 30 intentos).
2. Aplica migraciones Drizzle.
3. Bootstrap del primer admin si `ADMIN_BOOTSTRAP_*` están seteados y la tabla está vacía.
4. Seed desde JSON si la tabla `products` está vacía.
5. Cierra la conexión y termina.

Empaquetado en `dist/entrypoint.mjs` (9 KB) con esbuild `--packages=external` para usar las dependencias de `node_modules` en runtime.

`Dockerfile` final:

- Build: copia fuentes, `npm ci`, `npm run build` (que ahora también bundlea entrypoint).
- Runner: Node 22 alpine con `dist/`, `node_modules/`, `drizzle/`. Healthcheck con `wget`. CMD ejecuta entrypoint antes del servidor.

`docker-compose.yml`:

- `db` con healthcheck `pg_isready`.
- `web` con `depends_on: db: condition: service_healthy`, volúmenes `pgdata` y `media`, puerto configurable con `WEB_PORT`.

`README.md` reescrito con:

- Arquitectura
- Comandos
- Variables de entorno
- Flujo Docker
- Lista de endpoints
- Modelo de datos
- Estructura de carpetas
- Procedimiento de backup (`pg_dump` + `tar` del volumen `media`)
- Flujo de desarrollo sin Docker

## 6. Tradeoffs vs. plan original

| Aspecto | Plan original | Implementación | Ganancia |
| --- | --- | --- | --- |
| Repos | 2 (`SablonArtesania` + `sablon-api`) | 1 | menos CI, menos despliegues |
| Servicios runtime | 3 (web, api, db) | 2 (web, db) | menos ops |
| Auth | cookie cross-service + proxy SSR | cookie same-origin | sin `INTERNAL_API_URL`, sin CORS |
| ORM | SQLAlchemy (Python) | Drizzle (TS) | tipado de extremo a extremo |
| Migraciones | Alembic | drizzle-kit | declarativas, en TS |
| Nginx interno | sí, como reverse proxy | no (Node standalone sirve `/media/*` con Range) | un contenedor menos, suficiente al volumen esperado |
| Días estimados | 7-8 | 3-4 (en este sprint fue 1 sesión) | a la mitad |

Coste: si en el futuro se quiere una app móvil consumiendo el API, los endpoints ya están factorizados en `src/pages/api/` y se pueden extraer sin reescritura. Si más adelante hace falta Python, se monta `sablon-api` como servicio adicional contra el mismo Postgres sin romper nada.

## 7. Funcionalidad entregada (mapeo al plan)

| Requisito del `PLAN_ADMIN_ESCAPARATE.md` | Estado | Dónde |
| --- | --- | --- |
| Escaparate dinámico con productos `disponible` | ✅ | `src/pages/productos.astro` + `src/lib/db/client.ts` |
| Estados `disponible / vendido / oculto` | ✅ | enum `productStatus` |
| Precio orientativo | ✅ | `price_cents` + `currency` en `products`, mostrado en escaparate y ficha |
| Botón "Consultar" | ✅ | `src/components/ProductInquiryForm.tsx` en `/productos/[slug]` |
| Pieza única desaparece al venderse | ✅ | filtro `status='disponible'` en `GET /api/public/products` |
| Admin UI en `/admin/*` con SSR | ✅ | `AdminShell.astro` + `output:'server'` + `middleware.ts` |
| Auth admin (login + cookie httpOnly) | ✅ | `src/lib/auth.ts` + cookie HMAC firmada |
| Modelos `Product`, `Category`, `ProductImage`, `User`, `Artisan`, `Inquiry` | ✅ | `src/lib/db/schema.ts` |
| Migración inicial | ✅ | `drizzle/0000_*.sql` |
| Bootstrap admin por env vars | ✅ | `scripts/entrypoint.ts` + `scripts/bootstrap-admin.ts` |
| Notificación Telegram en formulario de contacto | ✅ | `src/lib/telegram.ts` + `inquiries.ts` |
| Stack Astro + React + Tailwind, misma paleta | ✅ | sin cambios en la paleta |
| CRUD admin completo | ✅ | Fases 5 y 6 |
| Subida de imágenes con validación | ✅ | `src/lib/storage.ts` + `api/admin/products/[id]/images.ts` |
| Endpoint público `GET /api/public/products/{slug}` | ✅ | `src/pages/api/public/products/[slug].ts` |
| `POST /api/public/inquiries` sin FK a producto ni `origin` | ✅ | `src/pages/api/public/inquiries.ts` |
| Marcar como vendido (rápido) | ✅ | `PATCH /api/admin/products/{id}/status` |
| Cambiar nombre de `sablon-bot` → `sablon-api` | N/A | se unificó en este repo |
| Smoke test, backup BD, README | ✅ | `README.md`, backups con `pg_dump` + tar |

## 8. Smoke test ejecutado

Con `.env` configurado (Postgres en Docker + SESSION_PASSWORD aleatorio + ADMIN_BOOTSTRAP_PASSWORD=`admin1234`):

```sh
docker compose up -d --build
```

Verificación de salud:

- Contenedor `db` con healthcheck `pg_isready` pasando.
- Contenedor `web` con healthcheck `wget` pasando.
- Logs del entrypoint: `[entrypoint] Migrations applied.` → `[entrypoint] Bootstrap admin created: admin@sablon.local` → `[entrypoint] Seed completed.` → `[entrypoint] Setup OK. Starting server…`.

End-to-end cubierto por los tests manuales (login → seed → catálogo → ficha → inquiry → marcar vendido → upload).

## 9. Archivos clave para revisar

- `astro.config.mjs` — cambio a `output:'server'`
- `src/lib/db/schema.ts` — modelo de datos
- `src/lib/auth.ts` — sesión con cookie firmada
- `src/middleware.ts` — gates de `/admin/*` y `/api/admin/*`
- `src/components/admin/ProductForm.tsx` — pieza central del admin
- `scripts/entrypoint.ts` — orquestación al arranque
- `docker-compose.yml` + `Dockerfile` — empaquetado
- `README.md` — guía operativa

## 10. Próximos pasos sugeridos

1. **Producción**: cambiar `WEB_PORT`, generar `SESSION_PASSWORD` real, restringir `POSTGRES_PASSWORD`, montar `pgdata` y `media` en un sistema con snapshots.
2. **Backups programados**: cron con `pg_dump` + `tar` del volumen media, retención 14/30 días.
3. **HTTPS**: meter un reverse proxy (Caddy/Traefik) delante del puerto `4321` para TLS + cabeceras extra.
4. **Cache del escaparate**: nginx con `proxy_cache` o `stale-while-revalidate` sobre `/api/public/products` (no necesario a este volumen, pero documentado en el plan original).
5. **Borrado definitivo** de `src/data/products.json` y `src/data/collaborators.json` cuando se confirme que el seed funcionó en producción y la web no los importa ya.
6. **Sitemap**: el plugin `@astrojs/sitemap` ya está activo; en cuanto se publiquen productos en BD, regenerar en build (considerar mover a `prerender=false` para `/productos/[slug]` o un endpoint dinámico que lo regenere).
7. **CI/CD**: adaptar el workflow de GHCR existente para construir la nueva imagen multi-stage y publicar la etiqueta `:admin`.
