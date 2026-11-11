# Arquitectura actual: escaparate y panel de administración

Documento de referencia de la implementación vigente. La arquitectura antigua de FastAPI + Postgres queda reemplazada por una aplicación Astro full-stack con SQLite.

## 1. Decisiones

| Área | Decisión actual |
|---|---|
| Aplicación | Un solo repo y runtime: `SablonArtesania` (Astro SSR en Node.js 26 LTS) |
| Backend | Endpoints nativos de Astro en `src/pages/api/`; no hay servicio FastAPI en el despliegue |
| Base de datos | SQLite local mediante Drizzle ORM + `@libsql/client` |
| Archivo persistente | `SQLITE_DB_PATH`; en Docker, `/app/data/sablon.sqlite` dentro del volumen `data` |
| Imágenes | Disco en `MEDIA_DIR` y volumen `media`; las imágenes eliminadas lógicamente se conservan para poder restaurarlas |
| Autenticación | Cookie httpOnly firmada, verificada por middleware en Astro |
| Catálogo | Piezas únicas, precio orientativo, consulta de disponibilidad; no hay pago online |
| Mercados | Eventos del calendario guardados en SQLite y editables desde `/admin/mercados` |
| Formularios | Se guardan como consultas en SQLite y se notifican a Telegram si se configura el bot |
| Métricas | Vistas agregadas por fecha y ruta, sin IP, cookies ni identificador personal |

SQLite está dimensionado para una instancia de la aplicación. Si se necesitan varias réplicas con escrituras concurrentes, deberá reconsiderarse PostgreSQL.

## 2. Arquitectura

```text
┌────────────────────────────────────────────────────────────┐
│ SablonArtesania — Astro SSR / Node.js                      │
│                                                            │
│ páginas públicas · /admin/* · /api/public/* · /api/admin/* │
│ middleware de sesión · validación · Drizzle                │
└───────────────────────────┬────────────────────────────────┘
                            │ acceso solo desde servidor
                 ┌──────────┴─────────────┐
                 │ SQLite /app/data/*.db  │
                 └────────────────────────┘
                 ┌────────────────────────┐
                 │ media /app/media       │
                 └────────────────────────┘
                            │
                            └── Telegram Bot API (avisos opcionales)
```

El navegador no accede al archivo SQLite. Envía peticiones same-origin a Astro; Astro aplica las reglas de autenticación, validación y persistencia. En producción, `scripts/entrypoint.ts` aplica migraciones, crea el admin inicial y siembra el catálogo. En desarrollo, el middleware aplica las migraciones antes de la primera petición SSR/API.

## 3. Modelo de datos

Los nombres físicos de las tablas están en singular. Sus nombres y columnas se centralizan en `src/lib/db/names.ts`; el esquema Drizzle vive en `src/lib/db/schema.ts`.

```text
artisan 1 ── N product N ── 1 category
                  │
                  ├── 1 ── N product_image
                  └── 0 ── N inquiry

user        cuentas del admin
market      evento del calendario
page_view   contador agregado por día y ruta
```

### Tablas

- `user`: `id`, `email` (único), `password_hash`, `role`, `created_at`, `deleted_at`.
- `artisan`: `id`, `slug` (único), `name`, especialidad, ubicación, bios, imagen, Instagram, `active`, orden, timestamps y `deleted_at`.
- `category`: `id`, `slug` (único), `name`, `active`, orden, `created_at`, `deleted_at`.
- `product`: `id`, `slug` (único), `artisan_id`, `category_id`, nombre y descripciones, `price_cents`, `currency`, `status`, `active`, orden, timestamps y `deleted_at`.
- `product_image`: `id`, `product_id`, `url`, `sort_order`, `alt_text`, `deleted_at`.
- `inquiry`: nombre, email, teléfono, mensaje, tipo (`contact`/`product`), estado, fecha y `deleted_at`. No tiene relación con `product` ni columna `origin`; si la consulta viene de una pieza, su nombre se incluye en el texto del mensaje.
- `market`: ubicación, fechas ISO, horario, enlace opcional, `active`, orden y timestamps. **No tiene `deleted_at`**: se elimina físicamente.
- `page_view`: `day`, `path`, contador `views` y `deleted_at`; `(day, path)` es único.

Estados de producto: `disponible`, `vendido`, `oculto`. Estados de consulta: `new`, `read`, `archived`.

### Publicación y borrado

- Las categorías y los productos tienen `active`; los artesanos ya tenían ese flag.
- El escaparate solo publica productos disponibles, activos y no eliminados, asociados a categoría y artesano activos y no eliminados.
- El borrado lógico pone `deleted_at`; no borra la fila ni rompe relaciones. Se aplica a usuarios, artesanos, categorías, productos, imágenes, consultas y métricas.
- El admin permite restaurar categorías, artesanos, piezas, imágenes y consultas. Los mercados son la excepción y se borran físicamente.
- Desactivar una categoría o un artesano oculta del escaparate las piezas relacionadas sin borrarlas.

## 4. API

### Público

- `GET /api/public/categories`, `/artisans`, `/markets`
- `GET /api/public/products` (filtros por estado, categoría y artesano)
- `GET /api/public/products/{slug}`
- `POST /api/public/inquiries` (consulta general o consulta sobre una pieza; sin FK a producto)

### Administración (cookie de sesión requerida)

- Auth: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.
- CRUD de productos, categorías y artesanos; cambio rápido de estado de producto.
- Gestión de imágenes: upload, reordenación, borrado lógico y restauración.
- Consultas: filtrar, cambiar estado, borrar lógicamente y restaurar.
- Mercados: `GET/POST /api/admin/markets`, `PATCH/DELETE /api/admin/markets/{id}`; `DELETE` elimina físicamente.

## 5. Flujos importantes

### Mercado

1. El admin crea o edita fechas desde `/admin/mercados`.
2. Astro valida lugar, fechas, horario y URL, y guarda el evento en `market`.
3. `/encuentranos` consulta SQLite al renderizar el calendario. No lee `src/data/markets.json`.

### Consulta y Telegram

1. El formulario envía nombre, email, teléfono, mensaje y tipo; el nombre de la pieza se añade como texto si corresponde.
2. Astro guarda la consulta en `inquiry`.
3. Si están configurados `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_IDS`, envía el aviso a uno o varios chats. Se conserva `TELEGRAM_CHAT_ID` singular por compatibilidad.

### Métricas

El middleware cuenta respuestas HTML correctas de páginas públicas, excluyendo admin, API, media, rutas de archivos y crawlers conocidos. Incrementa un único contador por día y ruta en `page_view`; no conserva IP, cookies, user-agent ni referrer.

## 6. Migraciones y datos

- `drizzle/0000_*.sql`: única migración SQLite con el esquema final: tablas singulares, flags y soft delete, e `inquiry` sin FK a `product` ni columna `origin`.
- Las migraciones PostgreSQL archivadas de este repo se eliminaron; la cadena vigente consta de una sola migración SQLite.
- Los seeds actuales cargan productos, categorías y artesanos desde los JSON existentes si el catálogo está vacío. **Los mercados no se siembran desde JSON.**
- La base PostgreSQL anterior no se importa automáticamente. Si contiene datos reales, se debe exportar/importar antes de cambiar el despliegue.

## 7. Despliegue y operación

El despliegue vive en `SablonArtesania/Dockerfile` y `SablonArtesania/docker-compose.yml`: un único contenedor `web`, con volúmenes persistentes `data` y `media`. No se usa un repo `sablon-deploy`, ni se despliegan `sablon-api` o Postgres. Los backups deben cubrir ambos volúmenes. Para una copia consistente de SQLite puede usarse `VACUUM INTO` mientras la aplicación está activa.

Variables principales: `SQLITE_DB_PATH`, `SESSION_PASSWORD`, `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD`, `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_IDS`.

## 8. Límites conocidos

- El contenido de talleres y las fichas informativas de mercados habituales siguen estáticos; el CRUD de mercados gestiona los eventos del calendario.
- No se migran automáticamente las bases PostgreSQL ya desplegadas.
- La solución SQLite está pensada para una sola instancia; imágenes y archivo SQLite requieren backups independientes.
