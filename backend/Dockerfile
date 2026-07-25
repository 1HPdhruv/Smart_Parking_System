# Stage 1: Install dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 2: Build TypeScript
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate
RUN npm run build

# Stage 3: Production runtime
FROM node:22-alpine AS runtime
WORKDIR /app

# Copy built files and production deps
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package.json ./

# Run migrations then start the server
# Render sets the PORT environment variable automatically
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

EXPOSE 3001
