# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Install Python for native module compilation (better-sqlite3)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json bun.lock ./

# Install production dependencies only
RUN bun install --production

# Copy source code
COPY . .

# Production stage
FROM oven/bun:1-slim

WORKDIR /app

# Install fonts for PDF Vietnamese support
RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/settings.json ./
COPY --from=builder /app/drizzle ./drizzle

# Create data directory for SQLite
RUN mkdir -p /app/data /app/logs

# Set environment
ENV NODE_ENV=production
ENV PORT=10000

# Expose port for API server
EXPOSE 10000

# Expose volume for persistent data
VOLUME ["/app/data", "/app/logs"]

CMD ["bun", "src/app/main.ts"]
