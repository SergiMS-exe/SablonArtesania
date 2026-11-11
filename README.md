# Sablón Artesanía

Web escaparate y panel de administración de El Sablón. Una única aplicación Astro sirve las páginas, el admin y los endpoints del servidor; la base de datos es SQLite y no hay un backend FastAPI separado.

## Stack y arquitectura

- Astro 7 (`output: 'server'`, adapter Node standalone), Node.js 26 LTS, React 19 y Tailwind CSS 4.
- SQLite local persistente, accedido únicamente desde el servidor mediante Drizzle ORM y `@libsql/client`.
- Rutas Astro en `src/pages/api/` para las operaciones públicas y del admin.
- Imágenes en disco bajo `MEDIA_DIR`; se sirven desde `/media/*`.
- Sesión admin en cookie httpOnly firmada con HMAC-SHA256.

```text
Navegador → Astro (páginas / endpoints / autenticación) → Drizzle → SQLite
                                                   └────→ volumen de imágenes
```

El navegador nunca abre el archivo SQLite. La configuración está pensada para **una instancia** de la aplicación.

## Desarrollo

```sh
npm install
cp .env.example .env
# Define SESSION_PASSWORD y ADMIN_BOOTSTRAP_PASSWORD.
npm run db:migrate
npm run db:bootstrap
npm run db:seed
npm run dev
```

Astro corre en `http://localhost:4321`. El acceso al panel está en `/admin/login`. En producción, el entrypoint aplica las migraciones y hace el bootstrap automáticamente.

Variables importantes:

```ini
SQLITE_DB_PATH=./data/sablon.sqlite
SESSION_PASSWORD=... # secreto aleatorio de al menos 32 caracteres
ADMIN_BOOTSTRAP_EMAIL=admin@sablon.local
ADMIN_BOOTSTRAP_PASSWORD=...
TELEGRAM_BOT_TOKEN=  # opcional
TELEGRAM_CHAT_IDS=   # opcional, uno o varios chat_id separados por comas
```

## Docker

```sh
docker compose up -d --build
docker compose logs -f web
```

Compose inicia un único servicio `web` y monta los volúmenes `data` (SQLite) y `media` (imágenes). La app aplica migraciones, crea el primer admin si no existe y siembra productos/artesanos si el catálogo está vacío.

## Admin

- Productos: alta, edición, estados disponible/vendido/oculto, flag `active` e imágenes restaurables.
- Categorías: CRUD con flag `active`; artesanos mantienen su flag `active`.
- Borrado lógico (`deleted_at`) para usuarios, artesanos, categorías, productos, imágenes, consultas y métricas; se pueden restaurar desde el admin cuando hay interfaz. Los mercados se borran físicamente.
- Mercados: fechas, ubicación, horario, enlace, publicación y orden. El calendario de `/encuentranos` lee directamente de SQLite; `src/data/markets.json` ya no es fuente de datos.
- Consultas: bandeja con estados. Se guardan sin relación/FK con productos ni columna `origin`; las consultas desde una pieza incluyen su nombre dentro del mensaje. Los avisos se envían por Telegram a todos los `TELEGRAM_CHAT_IDS` configurados (se mantiene `TELEGRAM_CHAT_ID` singular por compatibilidad).
- Métricas: páginas vistas agregadas por página y día, visibles en el dashboard. No se guardan IP, cookies ni identificadores personales; se excluyen admin, API, media y crawlers conocidos.

## Migraciones y scripts

| Comando | Acción |
|---|---|
| `npm run db:generate` | Genera una migración Drizzle desde el esquema SQLite |
| `npm run db:migrate` | Aplica las migraciones |
| `npm run db:seed` | Siembra productos y artesanos desde los JSON existentes (nunca mercados) |
| `npm run db:bootstrap` | Crea el primer admin desde `ADMIN_BOOTSTRAP_*` |
| `npm run build` | Construye la aplicación y el entrypoint de arranque |

Las tablas SQLite se llaman `user`, `artisan`, `category`, `product`, `product_image`, `inquiry`, `market` y `page_view`. Los identificadores de tablas, columnas e índices están centralizados en `src/lib/db/names.ts`; el esquema se define en `src/lib/db/schema.ts`.

## Endpoints principales

Públicos: `GET /api/public/products`, `GET /api/public/products/{slug}`, `GET /api/public/categories`, `GET /api/public/artisans`, `GET /api/public/markets`, `POST /api/public/inquiries`.

Admin (requieren sesión): CRUD de `/api/admin/products`, `/categories`, `/artisans`, `/markets`, `/inquiries`, y gestión de imágenes en `/api/admin/media` y `/api/admin/product-images/*`.

## Copias de seguridad

La base de datos y las imágenes son datos independientes. Para una copia consistente de SQLite mientras la web sigue activa:

```sh
docker compose exec -T web node --input-type=module -e "import { createClient } from '@libsql/client'; const db = createClient({url:'file:/app/data/sablon.sqlite'}); const path='/app/data/backup-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite'; await db.execute(\"VACUUM INTO '\"+path.replaceAll(\"'\",\"''\")+\"'\"); db.close();"
```

Respalda además el volumen `media`. Mantén ambos fuera del servidor. No uses `docker compose down -v` para parar el servicio normal: ese comando borra los volúmenes.

## Nota de migración

Hay una única migración SQLite con el esquema final: tablas singulares, flags/timestamps de borrado lógico e `inquiry` sin relación con productos ni columna `origin`. Las migraciones PostgreSQL archivadas de este repo se eliminaron. Si existe contenido real en una base PostgreSQL desplegada, debe exportarse/importarse manualmente; la aplicación no migra esa base.
