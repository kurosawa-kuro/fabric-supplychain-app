# Stage 1: build dependencies
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

# Stage 2: runtime
FROM node:18-alpine

WORKDIR /app

# ランタイムに必要なコードだけコピー
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Fabricの証明書や接続情報をvolumeマウント予定の場所として確保
VOLUME /app/wallet
VOLUME /app/config

# APIポート（Expressのserver.jsが使うポート）
EXPOSE 3000

# 起動コマンド（package.jsonに "start": "node server.js" がある前提）
CMD ["npm", "start"]
