FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY server/ ./server/
COPY prisma/ ./prisma/
COPY src/generated/ ./src/generated/

# Generate Prisma client
RUN npx prisma generate

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server ./server
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/package.json ./

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "--import", "tsx/esm", "server/src/main.ts"]

