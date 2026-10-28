# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Client (VITE_*) config is baked into the bundle at build time. Railway exposes
# service variables to Dockerfile builds as build args — declare them so vite
# sees them during `npm run build`. Set these in the Railway service settings.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_STRIPE_PUBLIC_KEY
ARG VITE_MAPBOX_ACCESS_TOKEN
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_STRIPE_PUBLIC_KEY=$VITE_STRIPE_PUBLIC_KEY \
    VITE_MAPBOX_ACCESS_TOKEN=$VITE_MAPBOX_ACCESS_TOKEN

RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 5000
ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "dist/index.js"]
