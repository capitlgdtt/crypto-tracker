# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build

# better-sqlite3 may need to compile from source when a prebuild for the
# current Node version is unavailable. Install the toolchain in the build
# stage only; the final image will not include it.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

# Match local npm version to keep package-lock.json portable
RUN npm install -g npm@11

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src

RUN npm run build \
 && npm prune --omit=dev

# ---

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

# Copy pruned production dependencies and the compiled output from the build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

COPY package.json ./

# better-sqlite3 needs a writable directory for the database file
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "dist/index.js"]