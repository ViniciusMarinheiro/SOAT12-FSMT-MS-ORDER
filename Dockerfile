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

# Copiar arquivos de configuração necessários
COPY --from=build /usr/src/app/tsconfig.json ./tsconfig.json

# Definir variáveis de ambiente para produção
ENV NODE_ENV=production
ENV PORT=3333

# Expor a porta
EXPOSE 3333

# Comando para iniciar a aplicação (roda migrations, seed e inicia)
CMD ["/bin/sh", "-c", "yarn typeorm-ts-node-commonjs migration:run -d dist/src/common/service/database/data-source.js && node dist/src/main.js"]