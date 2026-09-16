FROM node:24.21.0-alpine AS builder

WORKDIR /app

# 의존성 파일만 먼저 복사하여 설치
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:24.21.0-alpine AS runner

WORKDIR /app

ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
