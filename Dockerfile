# Dockerfile para P&S Tech - Oficina API (NestJS + TypeORM + PostgreSQL)

# ================================
# Stage 1: Build
# ================================
# Dependências (ex.: newrelic) exigem Node 20.19+ ou 22+. 20-alpine3.19 traz 20.18.x.
FROM node:22-alpine AS build

WORKDIR /usr/src/app

# Copiar arquivos de dependências
COPY package.json yarn.lock ./

# Instalar dependências
RUN yarn install --frozen-lockfile

# Copiar código fonte
COPY . .

# Build da aplicação com SWC
RUN yarn run build

# Limpar dependências de desenvolvimento
RUN yarn install --production --frozen-lockfile && yarn cache clean

# ================================
# Stage 2: Production
# ================================
FROM node:22-alpine AS production

# Instalar dependências do sistema necessárias
RUN apk update && apk add --no-cache \
    ca-certificates \
    && rm -rf /var/cache/apk/*

WORKDIR /usr/src/app

# Copiar arquivos do stage de build
COPY --from=build /usr/src/app/package.json ./package.json
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/ensure-schema.js ./ensure-schema.js

# Copiar arquivos de configuração necessários
COPY --from=build /usr/src/app/tsconfig.json ./tsconfig.json

# Definir variáveis de ambiente para produção
ENV NODE_ENV=production
# 👇 AQUI ESTÁ A CORREÇÃO: Mudando de 3333 para 3000
ENV PORT=3000

# 👇 AQUI ESTÁ A CORREÇÃO: Mudando de 3333 para 3000
EXPOSE 3000

# Comando: criar schema, rodar migrations, iniciar app (data-source.js já está no build)
CMD ["/bin/sh", "-c", "node ensure-schema.js && yarn typeorm-ts-node-commonjs migration:run -d dist/src/common/service/database/data-source.js && node dist/src/main.js"]
