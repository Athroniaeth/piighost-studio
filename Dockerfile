# syntax=docker/dockerfile:1

# --- Build stage: produce the Next.js static export (./out) ---
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable

# Install dependencies first for better layer caching. The pinned pnpm version
# comes from package.json's "packageManager" field (read by corepack).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Build the static site. next.config.ts has output: "export", so this emits
# fully static HTML/JS into /app/out (no Node server at runtime).
COPY . .
RUN pnpm build

# --- Runtime stage: serve the static files with nginx ---
FROM nginx:alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/out /usr/share/nginx/html
EXPOSE 80
# nginx:alpine's default CMD already runs `nginx -g 'daemon off;'`.
