# syntax=docker/dockerfile:1.7

FROM node:26-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

COPY . .

ARG PUBLIC_SITE_URL
ENV PUBLIC_SITE_URL=$PUBLIC_SITE_URL

RUN npm run build
RUN npm prune --omit=dev --no-audit --no-fund

# --- runtime ---
FROM node:26-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libstdc++
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321 \
    MEDIA_DIR=/app/media \
    SQLITE_DB_PATH=/app/data/sablon.sqlite

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
COPY drizzle ./drizzle

RUN mkdir -p /app/media /app/data

EXPOSE 4321

HEALTHCHECK --interval=30s --timeout=3s --start-period=30s \
    CMD wget -qO- http://127.0.0.1:4321/ >/dev/null 2>&1 || exit 1

CMD ["sh", "-c", "node ./dist/entrypoint.mjs && node ./dist/server/entry.mjs"]
