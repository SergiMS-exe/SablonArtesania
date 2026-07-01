# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

COPY . .

ARG PUBLIC_CONTACT_ENDPOINT
ENV PUBLIC_CONTACT_ENDPOINT=$PUBLIC_CONTACT_ENDPOINT

RUN npm run build

FROM nginx:1.27-alpine AS runner

RUN printf '%s\n' \
    'gzip on;' \
    'gzip_comp_level 6;' \
    'gzip_min_length 1024;' \
    'gzip_proxied any;' \
    'gzip_vary on;' \
    'gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;' \
    > /etc/nginx/conf.d/gzip.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
