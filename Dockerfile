FROM node:20-alpine AS development

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY --from=development /app/dist ./dist

# 포트는 환경 변수에서 읽으므로 EXPOSE는 선택사항 (문서화 목적)
EXPOSE 5001

CMD ["node", "dist/src/main.js"]
