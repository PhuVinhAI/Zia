# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Install Python for native module compilation (better-sqlite3)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Production stage
FROM oven/bun:1-slim

WORKDIR /app

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/drizzle.config.ts ./

# Create data directory for SQLite
RUN mkdir -p /app/data /app/logs

# Set environment
ENV NODE_ENV=production

# Expose volume for persistent data
VOLUME ["/app/data", "/app/logs"]

CMD ["bun", "src/index.ts"]
