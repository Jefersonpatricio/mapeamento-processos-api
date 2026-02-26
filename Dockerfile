# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copia os arquivos de dependências primeiro (aproveita cache do Docker)
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY prisma.config.ts ./

# Instala TODAS as dependências (incluindo devDependencies para compilar)
RUN npm ci

# Copia o restante do código
COPY prisma ./prisma
COPY src ./src
COPY lib ./lib

# Gera o Prisma Client
# prisma.config.ts exige DATABASE_URL mesmo no generate (Prisma 7).
# Passamos um valor fictício apenas para satisfazer a validação — o generate
# não se conecta ao banco, ele só lê o schema e gera os tipos TypeScript.
ARG DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ENV DATABASE_URL=${DATABASE_URL}
RUN npx prisma generate

# Compila o TypeScript para JavaScript
RUN npm run build

# Garante que o build gerou main.js
RUN test -f /app/dist/src/main.js && echo "✅ dist/src/main.js OK"

# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# Copia os artefatos do stage de build
COPY --from=builder /app/package.json ./package.json
# Copia os arquivos compilados do stage anterior
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
# O Prisma 7 precisa do node_modules para carregar o prisma.config.ts (usa jiti/tsx embutido)
COPY --from=builder /app/node_modules ./node_modules

# Expõe a porta da aplicação
EXPOSE 3000

# Inicia a aplicação
CMD ["node", "dist/src/main.js"]
