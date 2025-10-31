# Pricing Service (Rust for maximum performance)
FROM rust:1.75-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache musl-dev

# Copy Rust project
COPY services/pricing-service/Cargo.toml ./
COPY services/pricing-service/src ./src

# Build release binary
RUN cargo build --release

# Production stage
FROM alpine:latest

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache ca-certificates

# Copy binary from builder
COPY --from=builder /app/target/release/pricing-service ./pricing-service

ENV PORT=4001

EXPOSE 4001

# Health check
HEALTHCHECK --interval=30s --timeout=2s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:4001/health || exit 1

CMD ["./pricing-service"]

