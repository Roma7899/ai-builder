FROM node:20-alpine AS base
RUN apk add --no-cache openssl
WORKDIR /app

FROM base AS deps
COPY package*.json ./
COPY prisma/ ./prisma/
RUN npm ci
RUN npx prisma generate

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3001
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER appuser
EXPOSE 3001
CMD ["node", "dist/server.js"]
