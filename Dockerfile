# ---------- deps + build ----------
FROM node:20 AS builder
WORKDIR /app

# pnpm aktif
RUN corepack enable && corepack prepare pnpm@9 --activate

# Kilit/manifest dosyaları
COPY package.json pnpm-lock.yaml ./

# Deterministik kurulum
RUN pnpm install --frozen-lockfile

# Uygulama kaynakları
COPY . .

# Prisma client ve prod build
RUN pnpm prisma generate
RUN pnpm run build

# ---------- runtime ----------
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Sadece gereken dosyalar
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# İsteğe bağlı: düşük yetkili kullanıcı
RUN adduser --system --uid 1001 appuser && chown -R appuser:appuser /app
USER appuser

# Uygulama portu (projene göre değiştir)
EXPOSE 4000

# Start komutun: package.json içindeki "start" scriptini çağırır.
# Örn. "start": "node dist/server.js" ya da benzeri olmalı.
CMD ["pnpm","run","start"]
