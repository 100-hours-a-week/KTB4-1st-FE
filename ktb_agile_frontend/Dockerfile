FROM node:24.21.0-alpine AS builder

WORKDIR /app

# 의존성 파일만 먼저 복사하여 설치
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# NEXT_PUBLIC_* 값은 빌드 시점에 번들에 삽입되므로, CI의 FE_ENV 시크릿(.env 형식)을 빌드 중에만 .env.production으로 마운트
# 시크릿이 없으면(PR 체크, 로컬 빌드) 마운트 없이 그대로 빌드됨
# standalone 빌드가 .env.production을 결과물로 복사하므로, 값이 번들에 삽입된 뒤 삭제해 최종 이미지에 남기지 않음
RUN --mount=type=secret,id=fe_env,target=/app/.env.production \
    npm run build && rm -f .next/standalone/.env.production

FROM node:24.21.0-alpine AS runner

WORKDIR /app

ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
