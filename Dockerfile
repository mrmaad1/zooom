# ---- build ----------------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime --------------------------------------------------------------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm i -g tsx@4.19.2
COPY --from=build /app/dist ./dist
COPY --from=build /app/src ./src
COPY tsconfig.json ./
EXPOSE 3000
CMD ["tsx", "src/server/index.ts"]
