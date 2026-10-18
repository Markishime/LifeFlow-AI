FROM node:22.16.0-alpine AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY apps/admin/package.json apps/admin/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/api-contracts/package.json packages/api-contracts/package.json
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY NEXT_TELEMETRY_DISABLED=1
ENV CONTAINER_BUILD=true
RUN npm run build:admin
FROM node:22.16.0-alpine
WORKDIR /workspace
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /workspace/apps/admin/.next/standalone ./
COPY --from=build --chown=node:node /workspace/apps/admin/.next/static ./apps/admin/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/admin/server.js"]
