# Use the official Bun image
FROM oven/bun:1.2-alpine AS base
WORKDIR /app

# Install client, core, and server dependencies
COPY package.json bun.lock ./
COPY client/package.json ./client/
COPY core/package.json ./core/

RUN bun install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Generate Prisma client
RUN bun x prisma generate

# Build the client static assets
RUN cd client && bun run build

# Expose the server port
EXPOSE 4000

# Set environment to production
ENV NODE_ENV=production
ENV PORT=4000

# Run migrations, seed the database, and start the server
CMD ["sh", "-c", "bun x prisma migrate deploy && bun run db:seed && bun run src/server.ts"]
