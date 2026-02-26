# 🗂️ Mapeamento de Processos — API

API RESTful desenvolvida como solução para o **case técnico da Stage Consulting**, com o objetivo de gerenciar e mapear os processos internos de uma organização. A ideia central é permitir que uma empresa cadastre seus **departamentos**, relacione **processos** a eles (incluindo hierarquia pai/filho entre processos), controle o estado de cada processo (ativo/inativo, documentado ou não) e mantenha um **histórico de auditoria** de quem criou ou atualizou cada registro.

---

## 📋 Índice

1. [Visão Geral](#-visão-geral)
2. [Arquitetura](#-arquitetura)
3. [Tecnologias Utilizadas](#-tecnologias-utilizadas)
4. [Estrutura do Projeto](#-estrutura-do-projeto)
5. [Modelo de Dados (Banco de Dados)](#-modelo-de-dados-banco-de-dados)
6. [Autenticação e Autorização](#-autenticação-e-autorização)
7. [Endpoints da API](#-endpoints-da-api)
8. [Como Rodar o Projeto Localmente](#-como-rodar-o-projeto-localmente)
9. [Banco de Dados e Migrações](#-banco-de-dados-e-migrações)
10. [Usuários de Teste (Seed)](#-usuários-de-teste-seed)
11. [Decisões Técnicas](#-decisões-técnicas)

---

## 🎯 Visão Geral

A API foi construída seguindo as boas práticas do mercado:

- **Arquitetura modular**: cada funcionalidade vive no seu próprio módulo (Auth, Departments, Processes), facilitando manutenção e escalabilidade.
- **Autenticação via JWT**: todas as rotas (exceto login) exigem um token válido.
- **Controle de papéis (Roles)**: existem dois perfis — `admin` e `user` — e certas ações podem ser restritas por papel. (Todas as ações neste caso foram direcionadas para o admin)
- **Auditoria completa**: todo registro sabe quem o criou (`createdBy`) e quem foi a última pessoa a modificá-lo (`updatedBy`).
- **Hierarquia de processos**: um processo pode ter um processo "pai", criando uma árvore de subprocessos.
- **Filtros avançados**: a listagem de processos aceita filtros por departamento, tipo, status, documentação e busca textual.

---

## 🏛️ Arquitetura

A aplicação segue o padrão de arquitetura recomendado pelo **NestJS**, que se inspira muito no Angular: tudo é organizado em módulos, e cada módulo tem suas próprias responsabilidades bem definidas.

```
Cliente (Browser/Postman)
        │
        ▼ Requisição HTTP com Bearer Token
┌──────────────────────────────────────────────┐
│              NestJS Application              │
│                                              │
│  ┌─────────────────────────────────────┐     │
│  │         Guards (Segurança)          │     │
│  │  AuthGuard  → valida o JWT          │     │
│  │  RolesGuard → verifica o papel      │     │
│  └──────────────┬──────────────────────┘     │
│                 │                            │
│    ┌────────────┼────────────┐               │
│    ▼            ▼            ▼               │
│  Auth        Departments  Processes          │
│  Module       Module       Module            │
│  (Controller  (Controller  (Controller       │
│  + Service)   + Service)   + Service)        │
│    │            │            │               │
│    └────────────┴────────────┘               │
│                 │                            │
│          PrismaService                       │
│       (Conexão com o Banco)                  │
└─────────────────┬────────────────────────────┘
                  │
                  ▼
          PostgreSQL Database
     (User, Department, Process, Document)
```

### Visão em Diagrama (Mermaid)

```mermaid
graph TB
    subgraph CLIENT["🖥️ Cliente (Frontend / Postman)"]
        REQ[Requisição HTTP]
    end

    subgraph NESTJS["🚀 NestJS Application"]
        direction TB

        subgraph GUARDS["🛡️ Guards - Segurança"]
            AG[AuthGuard - Valida JWT]
            RG[RolesGuard - Verifica Papel]
        end

        subgraph MODULES["📦 Módulos"]
            direction LR

            subgraph AUTH["Auth Module"]
                AC[AuthController - POST /auth/login]
                AS[AuthService - Login + JWT]
            end

            subgraph DEPT["Departments Module"]
                DC[DepartmentsController - CRUD]
                DS[DepartmentsService - Regras de Negócio]
            end

            subgraph PROC["Processes Module"]
                PC[ProcessesController - CRUD]
                PS[ProcessesService - Regras de Negócio]
            end
        end

        subgraph PRISMA["🗄️ Prisma Module"]
            PRS[PrismaService - Conexão com o banco]
        end
    end

    subgraph DB["🐘 PostgreSQL"]
        U[(User)]
        D[(Department)]
        P[(Process)]
        DOC[(Document)]
    end

    REQ -->|"Bearer Token"| GUARDS
    GUARDS --> AUTH
    GUARDS --> DEPT
    GUARDS --> PROC
    AC --> AS
    DC --> DS
    PC --> PS
    AS --> PRS
    DS --> PRS
    PS --> PRS
    PRS --> U
    PRS --> D
    PRS --> P
    PRS --> DOC
```

### Como o fluxo funciona na prática?

1. O **cliente** faz uma requisição HTTP (ex.: `GET /processes`).
2. Antes de chegar no Controller, a requisição passa pelos **Guards**:
   - O `AuthGuard` lê o cabeçalho `Authorization`, extrai o token JWT e verifica se é válido. Se não for, retorna `401 Unauthorized`.
   - O `RolesGuard` verifica se o usuário tem o papel necessário para a rota. Se não tiver, retorna `403 Forbidden`.
3. Se passar pelos guards, a requisição chega ao **Controller**, que extrai os dados da URL, query string ou body.
4. O Controller chama o **Service**, que contém toda a **lógica de negócio** (ex.: verificar se um departamento já existe antes de criar, lançar erro se processo não for encontrado etc.).
5. O Service usa o **PrismaService** para conversar com o banco de dados PostgreSQL.
6. O resultado sobe de volta pela cadeia e é retornado como JSON para o cliente.

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia             | Versão | Para que serve                                                 |
| ---------------------- | ------ | -------------------------------------------------------------- |
| **Node.js**            | 22+    | Ambiente de execução JavaScript no servidor                    |
| **NestJS**             | 11     | Framework para construção da API, com estrutura modular        |
| **TypeScript**         | 5+     | Superset do JavaScript com tipagem estática, evita muitos bugs |
| **Prisma ORM**         | 7      | "Ponte" entre o código TypeScript e o banco de dados           |
| **PostgreSQL**         | 14+    | Banco de dados relacional principal                            |
| **JWT (jsonwebtoken)** | 9      | Geração e verificação de tokens de autenticação                |
| **bcryptjs**           | 3      | Hash seguro de senhas (nunca salvamos senha em texto puro)     |
| **ESLint + Prettier**  | —      | Garantia de qualidade e padronização do código                 |
| **Jest**               | 30     | Framework de testes automatizados                              |

---

## 📁 Estrutura do Projeto

```
mapeamento-processos-api/
│
├── prisma/
│   ├── schema.prisma       # Definição dos modelos do banco de dados
│   ├── seed.ts             # Script para popular o banco com dados iniciais
│   └── migrations/         # Histórico de todas as alterações no banco
│
├── generated/
│   └── prisma/             # Código gerado automaticamente pelo Prisma (não editar)
│
├── src/
│   ├── main.ts             # Ponto de entrada da aplicação
│   ├── app.module.ts       # Módulo raiz que importa todos os outros
│   │
│   ├── auth/               # Tudo relacionado a autenticação
│   │   ├── auth.module.ts
│   │   ├── auth.controler.ts   # Rota: POST /auth/login
│   │   ├── auth.service.ts     # Lógica de login e geração do JWT
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts  # Extrai o usuário logado da requisição
│   │   │   ├── public.decorators.ts       # Marca rotas como públicas (sem auth)
│   │   │   └── roles.decoratators.ts      # Marca rotas com papel exigido
│   │   ├── guards/
│   │   │   ├── auth.guard.ts    # Verifica se o JWT é válido
│   │   │   └── roles.guard.ts   # Verifica se o usuário tem o papel certo
│   │   └── dto/
│   │       └── login.dto.ts     # Formato esperado para o body do login
│   │
│   ├── departments/        # Tudo relacionado a departamentos
│   │   ├── departments.module.ts
│   │   ├── departments.controller.ts  # Rotas CRUD de departamentos
│   │   ├── departments.service.ts     # Regras de negócio
│   │   └── dto/
│   │       ├── create-department.dto.ts
│   │       └── update-department.dto.ts
│   │
│   ├── processes/          # Tudo relacionado a processos
│   │   ├── processes.module.ts
│   │   ├── processes.controler.ts     # Rotas CRUD de processos
│   │   ├── processes.service.ts       # Regras de negócio
│   │   └── dto/
│   │       ├── create-process.dto.ts
│   │       ├── update-process.dto.ts
│   │       └── process-filters.dto.ts # Filtros para listagem
│   │
│   └── prisma/             # Módulo compartilhado do Prisma
│       ├── prisma.module.ts
│       └── prisma.service.ts   # Instância única do Prisma Client
│
├── package.json
├── tsconfig.json
└── nest-cli.json
```

---

## 🗄️ Modelo de Dados (Banco de Dados)

O banco de dados possui **4 tabelas principais**, cujas relações estão descritas abaixo:

```
┌──────────────┐         ┌─────────────────────┐
│     User     │         │     Department       │
│──────────────│         │─────────────────────│
│ id (PK)      │◄────────│ createdById (FK)     │
│ email        │◄────────│ updatedById (FK)     │
│ name         │         │ id (PK)              │
│ password     │         │ name                 │
│ role         │         │ slug (único)         │
│ avatar       │         │ description          │
│ createdAt    │         │ manager              │
│ updatedAt    │         │ active               │
└──────────────┘         └──────────┬──────────┘
       ▲                            │ 1
       │                            │
       │                            │ N
       │                   ┌────────▼──────────┐         ┌──────────────┐
       │◄──────────────────│      Process       │────────►│   Document   │
       │ createdById        │────────────────────│         │──────────────│
       │ updatedById        │ id (PK)            │         │ id (PK)      │
                            │ name               │         │ filename     │
       Process ◄────────── │ parentId (FK self) │         │ originalName │
       (hierarquia pai/     │ type               │         │ mimeType     │
        filho)              │ criticality        │         │ size         │
                            │ active             │         │ url          │
                            │ documented         │         │ processId FK │
                            │ tools[]            │         │ uploadedAt   │
                            │ responsibles[]     │         └──────────────┘
                            │ documentLink       │
                            │ positionX/Y        │
                            │ departmentId (FK)  │
                            │ createdById (FK)   │
                            │ updatedById (FK)   │
                            └────────────────────┘
```

### Detalhes importantes de cada tabela:

#### `User` (Usuário)

- Representa as pessoas que acessam o sistema.
- O campo `role` pode ser `"admin"` ou `"user"`, determinando o nível de acesso.
- A senha nunca é salva em texto puro — passa por **bcrypt** (hash seguro).

#### `Department` (Departamento)

- Representa setores da empresa (ex.: RH, TI, Financeiro).
- O `slug` é uma versão "amigável" do nome para URLs (ex.: `"Recursos Humanos"` → `"rh"`).
- Guarda quem criou (`createdBy`) e quem modificou por último (`updatedBy`) — isso é **auditoria**.
- O campo `active` permite desativar um departamento sem precisar deletá-lo do banco.

#### `Process` (Processo)

- A entidade mais rica do sistema.
- Tem um campo `parentId` que aponta para outro `Process` da mesma tabela, permitindo criar **hierarquias** (macroprocesso → subprocesso → atividade).
- `type`: classifica o processo (ex.: operacional, estratégico, suporte).
- `criticality`: nível de criticidade do processo (ex.: alta, média, baixa).
- `tools[]` e `responsibles[]` são arrays de texto — listas de ferramentas usadas e responsáveis pelo processo.
- `positionX` / `positionY`: coordenadas para exibição em um canvas/mapa visual no frontend.
- `documented`: booleano que indica se o processo já foi formalmente documentado.
- `active`: indica se o processo está em operação ou foi desativado.

#### `Document` (Documento)

- Arquivos anexados a um processo (ex.: PDF com o manual do processo).
- Guarda metadados do arquivo: nome original, tipo MIME, tamanho em bytes e a URL de acesso.

---

## 🔐 Autenticação e Autorização

### Como funciona a autenticação?

A autenticação usa o padrão **JWT (JSON Web Token)**. O fluxo é:

```
1. Usuário envia email + senha  →  POST /auth/login
2. API verifica as credenciais no banco (senha comparada com hash bcrypt)
3. Se válido, gera um JWT assinado com JWT_SECRET
4. Cliente salva o token e envia em toda requisição futura:
   Authorization: Bearer <token>
5. AuthGuard intercepta a requisição, valida o token
6. Se válido, injeta os dados do usuário na requisição (id, email, role)
```

### O que está dentro do JWT?

```json
{
  "sub": "id-do-usuario",
  "email": "admin@mangoconsulting.com",
  "nome": "Administrador",
  "role": "admin",
  "iat": 1234567890,
  "exp": 1234654290
}
```

> `iat` = "issued at" (quando foi gerado) e `exp` = "expires at" (quando expira). Esses campos são padrão do JWT.

### Decorators personalizados

O projeto usa decorators do NestJS para tornar o código mais expressivo e limpo:

- **`@Public()`**: marca uma rota como pública (não exige autenticação). Usado em `POST /auth/login`.
- **`@Roles('admin')`**: marca uma rota que só pode ser acessada por administradores.
- **`@CurrentUser()`**: extrai o usuário logado diretamente do parâmetro do método, sem precisar acessar o objeto `request` manualmente.

### Exemplo de uso nos Controllers:

```typescript
@Post()
create(@Body() dto: CreateDepartmentDto, @CurrentUser() user: JwtPayload) {
  // user.sub = id do usuário logado, extraído automaticamente do JWT
  return this.departmentsService.create(dto, user.sub);
}
```

---

## 📡 Endpoints da API

### Auth

| Método | Rota          | Auth?      | Descrição                     |
| ------ | ------------- | ---------- | ----------------------------- |
| `POST` | `/auth/login` | ❌ Pública | Realiza login e retorna o JWT |

**Body esperado:**

```json
{
  "email": "admin@mangoconsulting.com",
  "password": "stage123"
}
```

**Resposta:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Departments (Departamentos)

Todas as rotas exigem autenticação (`Authorization: Bearer <token>`).

| Método   | Rota                      | Descrição                                                |
| -------- | ------------------------- | -------------------------------------------------------- |
| `GET`    | `/departments`            | Lista todos os departamentos + estatísticas de processos |
| `GET`    | `/departments/:id`        | Retorna um departamento específico pelo ID               |
| `POST`   | `/departments`            | Cria um novo departamento                                |
| `PUT`    | `/departments/:id`        | Atualiza completamente um departamento                   |
| `PATCH`  | `/departments/:id/status` | Ativa ou desativa um departamento (toggle)               |
| `DELETE` | `/departments/:id`        | Remove um departamento                                   |

**Body para criar/atualizar:**

```json
{
  "name": "Tecnologia da Informação",
  "slug": "ti",
  "description": "Área de suporte e desenvolvimento de sistemas",
  "manager": "João Silva"
}
```

**Detalhe:** ao listar departamentos, a API já retorna estatísticas computadas junto:

```json
{
  "id": "...",
  "name": "Recursos Humanos",
  "processCount": 12,
  "byType": { "operacional": 8, "suporte": 4 },
  "documentedCount": 5
}
```

---

### Processes (Processos)

Todas as rotas exigem autenticação.

| Método   | Rota                         | Descrição                                               |
| -------- | ---------------------------- | ------------------------------------------------------- |
| `GET`    | `/processes`                 | Lista todos os processos (com filtros via query string) |
| `GET`    | `/processes/:id`             | Retorna um processo com todos os detalhes               |
| `GET`    | `/processes/:id/children`    | Lista os subprocessos de um processo                    |
| `GET`    | `/departments/:id/processes` | Lista processos de um departamento específico           |
| `POST`   | `/processes`                 | Cria um novo processo                                   |
| `PUT`    | `/processes/:id`             | Atualiza um processo                                    |
| `PATCH`  | `/processes/:id/status`      | Ativa/desativa um processo (toggle)                     |
| `PATCH`  | `/processes/:id/documented`  | Marca/desmarca como documentado (toggle)                |
| `DELETE` | `/processes/:id`             | Remove um processo                                      |

**Filtros disponíveis via query string:**

```
GET /processes?departmentId=xxx&type=operacional&status=active&documented=true&search=onboarding
```

| Filtro         | Tipo                   | Descrição                                      |
| -------------- | ---------------------- | ---------------------------------------------- |
| `departmentId` | string                 | Filtra por departamento                        |
| `type`         | string                 | Filtra por tipo de processo                    |
| `status`       | `active` \| `inactive` | Filtra processos ativos ou inativos            |
| `documented`   | `true` \| `false`      | Filtra processos documentados                  |
| `search`       | string                 | Busca por nome ou descrição (case-insensitive) |

**Body para criar um processo:**

```json
{
  "name": "Processo de Onboarding",
  "description": "Processo de integração de novos colaboradores",
  "type": "operacional",
  "criticality": "alta",
  "departmentId": "id-do-departamento",
  "parentId": "id-do-processo-pai",
  "tools": ["Slack", "Notion", "Google Meet"],
  "responsibles": ["RH", "TI"],
  "documentLink": "https://notion.so/onboarding",
  "positionX": 100,
  "positionY": 200
}
```

> **Dica:** `parentId` é opcional. Quando preenchido, cria uma relação hierárquica — o processo criado se torna filho do processo indicado.

---

## 🚀 Como Rodar o Projeto Localmente

Existem duas formas de rodar o projeto: **com Docker** (mais simples, recomendado) ou **manualmente** (exige Node.js e PostgreSQL instalados).

---

### 🐳 Opção 1: Com Docker (recomendado)

Esta é a forma mais simples. O Docker sobe o PostgreSQL e a API juntos, sem precisar instalar nada além do próprio Docker.

**Pré-requisitos:**

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e rodando

**1. Clone o repositório:**

```bash
git clone <url-do-repositorio>
cd mapeamento-processos-api
```

**2. Configure as variáveis de ambiente:**

```bash
cp .env.example .env
```

Abra o `.env` e ajuste `JWT_SECRET` para uma chave secreta forte. Os demais valores já funcionam por padrão.

**3. Suba os containers:**

```bash
docker compose up --build
```

> 💡 Se você estava rodando `npm run start:dev` localmente, pare-o primeiro (`Ctrl+C`) para liberar a porta `3000`.

Isso vai:

- Baixar a imagem do PostgreSQL 16
- Construir a imagem da API a partir do `Dockerfile`
- Rodar as migrações do banco automaticamente (`prisma migrate deploy`)
- Iniciar a API na porta `3000`

> ⚠️ **Se você tiver PostgreSQL instalado localmente**, a porta `5432` pode estar ocupada. O `docker-compose.yml` já mapeia o PostgreSQL do container para a porta `5433` do host para evitar esse conflito. A API continua acessível em `http://localhost:3000` normalmente.

**4. (Opcional) Popule o banco com dados de teste:**

Em outro terminal, com os containers no ar:

```bash
docker compose exec api npm run seed
```

A API estará disponível em: `http://localhost:3000`

**Comandos úteis:**

```bash
# Subir em background (sem travar o terminal)
docker compose up -d --build

# Ver logs da API
docker compose logs -f api

# Parar tudo
docker compose down

# Parar e apagar o volume do banco (dados serão perdidos)
docker compose down -v
```

---

### 💻 Opção 2: Manualmente (sem Docker)

**Pré-requisitos:**

- [Node.js](https://nodejs.org/) v22 ou superior
- [PostgreSQL](https://www.postgresql.org/) rodando localmente
- [npm](https://www.npmjs.com/)

**1. Clone o repositório e instale as dependências:**

```bash
git clone <url-do-repositorio>
cd mapeamento-processos-api
npm install
```

**2. Configure as variáveis de ambiente:**

```bash
cp .env.example .env
```

Abra o `.env` e preencha com os dados do seu PostgreSQL local:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/mapeamento_processos"
JWT_SECRET="uma-chave-secreta-muito-forte-aqui"
JWT_EXPIRES_IN="1d"
```

> ⚠️ **Importante:** Nunca commite o arquivo `.env` no Git. Ele contém informações sensíveis como senha do banco e segredo do JWT!

**3. Execute as migrações do banco de dados:**

```bash
npx prisma migrate dev
```

Isso vai criar todas as tabelas no banco seguindo o que está definido em `schema.prisma`.

**4. Popule o banco com dados iniciais (seed):**

```bash
npm run seed
```

Isso cria 2 usuários de teste, alguns departamentos e processos de exemplo para você já poder testar a API.

**5. Inicie o servidor em modo de desenvolvimento:**

```bash
npm run start:dev
```

A API estará disponível em: `http://localhost:3000`

> O modo `start:dev` usa hot-reload: qualquer alteração no código reinicia o servidor automaticamente.

---

## 🗃️ Banco de Dados e Migrações

### O que é o Prisma?

O **Prisma** é um ORM (Object-Relational Mapper) moderno para TypeScript. Em vez de escrever SQL puro, você define seus modelos em um arquivo `schema.prisma` e o Prisma gera o código TypeScript tipado automaticamente.

**Exemplo comparativo:**

Sem Prisma (SQL puro):

```sql
SELECT * FROM "Process" WHERE "departmentId" = $1 AND "active" = true;
```

Com Prisma (TypeScript tipado):

```typescript
await prisma.process.findMany({
  where: { departmentId: "xxx", active: true },
});
```

A vantagem do Prisma é que o TypeScript sabe exatamente quais campos existem — se você tentar acessar um campo que não existe, o **editor já mostra o erro antes de você rodar o código**.

### Histórico de Migrações

As migrações estão em `prisma/migrations/` e representam cada evolução do banco ao longo do desenvolvimento:

| Migração                                       | O que foi feito                                                 |
| ---------------------------------------------- | --------------------------------------------------------------- |
| `20260225002059_init`                          | Criou as tabelas iniciais (User, Department, Process, Document) |
| `20260225115539_add_department_active`         | Adicionou o campo `active` em Department                        |
| `20260225122851_add_process_active_documented` | Adicionou os campos `active` e `documented` em Process          |
| `20260225143539_add_manager_in_departments`    | Adicionou o campo `manager` em Department                       |

> Cada migração é como um "commit do banco de dados" — garante que todos que rodam o projeto tenham exatamente a mesma estrutura, sem precisar recriar o banco do zero.

---

## 🌱 Usuários de Teste (Seed)

Após rodar `npm run seed`, os seguintes usuários estarão disponíveis:

| Email                       | Senha      | Papel   |
| --------------------------- | ---------- | ------- |
| `admin@mangoconsulting.com` | `stage123` | `admin` |
| `user@mangoconsulting.com`  | `stage123` | `user`  |

> O seed também cria departamentos (RH, TI, Financeiro etc.) e processos de exemplo para facilitar os testes da API.

---

## 💡 Decisões Técnicas

### Por que NestJS?

O NestJS é um framework opinado que força boas práticas desde o início: separação de responsabilidades, injeção de dependências, modularidade e testabilidade. Para um case que precisa demonstrar maturidade de código, foi a escolha ideal: a estrutura de módulos, controllers e services reflete um sistema pronto para crescer.

### Por que Prisma?

O Prisma oferece tipagem estática completa, gerada a partir do schema. Isso significa que erros como "campo inexistente no banco" são capturados **em tempo de compilação**, e não apenas em produção. Além disso, o Prisma Migrate torna o versionamento do banco tão simples quanto o Git — cada mudança no schema gera um arquivo de migração rastreável.

### Por que JWT sem biblioteca NestJS (Passport)?

A implementação manual do `AuthGuard` foi uma decisão consciente para demonstrar **entendimento do mecanismo** por trás da autenticação, e não apenas o uso de uma biblioteca que abstrai tudo. O fluxo de extrair o token do header, verificar com `jwt.verify` e injetar o payload na request é feito explicitamente, tornando o código didático e fácil de entender.

### Hierarquia de Processos (Self-relation)

O modelo `Process` tem uma relação consigo mesmo via `parentId`. Isso permite modelar estruturas reais como:

```
Macroprocesso de RH
├── Recrutamento e Seleção
│   ├── Triagem de CVs
│   └── Entrevistas
└── Onboarding
    ├── Documentação Admissional
    └── Treinamentos Iniciais
```

Essa abordagem é chamada de **self-referential relationship** (relação auto-referencial) e é amplamente usada para modelar hierarquias em bancos relacionais.

### Auditoria (createdBy / updatedBy)

Todo registro sensível guarda referência a quem o criou e quem foi o último a modificá-lo. Isso é um requisito comum em sistemas corporativos e foi implementado de forma transparente: o `@CurrentUser()` decorator extrai o ID do usuário logado do JWT e o repassa automaticamente para o service em cada operação de escrita.

### Campos `positionX` e `positionY`

Esses campos em `Process` foram pensados para integração com ferramentas de visualização de processos em canvas — por exemplo, um frontend usando **React Flow** — onde cada processo tem uma posição visual no mapa, permitindo criar diagramas interativos de fluxo de processos.

---

## 🧪 Testes

```bash
# Rodar todos os testes unitários
npm run test

# Rodar testes com relatório de cobertura de código
npm run test:cov

# Rodar testes end-to-end (integração)
npm run test:e2e
```

---

## 📦 Scripts Disponíveis

| Script               | Descrição                                        |
| -------------------- | ------------------------------------------------ |
| `npm run start:dev`  | Inicia em modo desenvolvimento (com hot-reload)  |
| `npm run build`      | Compila o TypeScript para JavaScript             |
| `npm run start:prod` | Inicia a versão compilada (produção)             |
| `npm run seed`       | Popula o banco com dados iniciais                |
| `npm run lint`       | Verifica e corrige problemas de estilo no código |
| `npm run test`       | Executa os testes automatizados                  |
| `npm run test:cov`   | Executa testes com relatório de cobertura        |
