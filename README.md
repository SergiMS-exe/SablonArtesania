# Sablón Artesanía

Sitio web de **Sablón Artesanía**, taller de artesanía en madera y piezas hechas a mano. La web sirve como escaparate del trabajo del artesano y de sus colaboradores: cada pieza es única, el catálogo funciona como muestra y se ofrecen personalizaciones cuando algo no está disponible.

## Secciones

- **Inicio** — presentación del taller.
- **Productos** — catálogo por categorías con piezas de ejemplo.
- **Artesanos** — el artesano y colaboradores (ver `src/data/collaborators.json`).
- **Encuéntranos** — calendario de mercados y ferias en los que se puede visitar el puesto (ver `src/data/markets.json`).
- **Talleres** — información sobre talleres.
- **Contacto** — formulario para encargos, personalizaciones y consultas.

> Esto no es una tienda online. La web muestra el trabajo y facilita el contacto para encargos.

## Stack

- [Astro](https://astro.build/) 5 (sitio estático)
- React 19 para componentes interactivos puntuales
- Tailwind CSS 4
- MDX, sitemap y RSS

## Datos editables

El contenido se gestiona en JSON dentro de `src/data/`:

- `products.json` — catálogo de piezas.
- `collaborators.json` — artesanos colaboradores.
- `markets.json` — fechas y ubicaciones de mercados.

## Comandos

Ejecutar desde la raíz del proyecto:

| Comando           | Acción                                        |
| :---------------- | :-------------------------------------------- |
| `npm install`     | Instala dependencias                          |
| `npm run dev`     | Servidor de desarrollo en `localhost:4321`    |
| `npm run build`   | Genera el sitio de producción en `./dist/`    |
| `npm run preview` | Previsualiza el build en local                |

## Docker

Build y ejecución del sitio servido por Nginx:

```sh
docker build -t sablon-artesania .
docker run --rm -p 8080:80 sablon-artesania
```

El sitio queda disponible en `http://localhost:8080`.
