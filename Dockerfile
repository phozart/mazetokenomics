# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (usb, etc.) and Prisma
RUN apk add --no-cache openssl python3 make g++ linux-headers eudev-dev

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy application code
COPY . .

# Build args for client-side env vars (NEXT_PUBLIC_*)
# These must be set at build time for Next.js to include them
ARG NEXT_PUBLIC_SOLANA_RPC_URL
ARG NEXT_PUBLIC_HELIUS_API_KEY

# Set them as ENV so Next.js can access during build
ENV NEXT_PUBLIC_SOLANA_RPC_URL=$NEXT_PUBLIC_SOLANA_RPC_URL
ENV NEXT_PUBLIC_HELIUS_API_KEY=$NEXT_PUBLIC_HELIUS_API_KEY

# Build the application with memory limit to prevent OOM
# Use webpack instead of Turbopack for more stable memory usage
ENV NODE_OPTIONS="--max-old-space-size=1536"
RUN npx next build --webpack

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install OpenSSL for Prisma runtime and postgresql-client for schema initialization
RUN apk add --no-cache openssl postgresql-client

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3003

ENV PORT=3003
ENV HOSTNAME="0.0.0.0"

CMD ["./docker-entrypoint.sh"]
