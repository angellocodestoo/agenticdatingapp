# Build stage
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
# better-sqlite3 ships prebuilt binaries for linux x64/arm64; build tools are
# only needed if the prebuild is missing for the platform.
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# SQLite database + uploaded photos live here — mount a persistent volume.
RUN mkdir -p /app/data && chown -R node:node /app
VOLUME /app/data

USER node
EXPOSE 3000
CMD ["node", "server.js"]
