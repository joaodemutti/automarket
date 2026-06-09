# AutoMarket

Plataforma de compra e venda de veículos usados com chat em tempo real.

## Stack

- **Next.js 16** (App Router) + **TypeORM** + **PostgreSQL**
- **jose** (JWT, Edge-compatible) + **bcrypt** (passwords)
- **TanStack Query v5** + **Axios** (frontend data layer)
- **ShadcnUI** + **TailwindCSS v4** (UI)
- **chat-server/** — Node.js + `ws` standalone WebSocket service

---

## Running locally

### Prerequisites

```bash
docker compose up -d   # starts PostgreSQL on localhost:5432
```

### 1. Next.js app

```bash
# Install dependencies
npm install --strict-ssl=false   # required if corporate proxy/cert issue

# Start dev server (TypeORM synchronize:true creates tables on first run)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 2. Chat server

```bash
cd chat-server
npm install --strict-ssl=false
npm run dev     # starts WebSocket server on ws://localhost:8080
```

Health check: [http://localhost:8080/health](http://localhost:8080/health)

### 3. API docs (Swagger)

Open [http://localhost:3000/docs](http://localhost:3000/docs) (Swagger UI)
Raw spec: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

---

## Environment variables

### `.env.local` (app)

```env
DATABASE_URL=postgresql://test:test@localhost:5432/test
JWT_SECRET=automarket_super_secret_change_me_in_production
JWT_EXPIRES_IN=7d
NEXT_PUBLIC_WS_URL=ws://localhost:8080
NODE_ENV=development
```

### `chat-server/.env`

```env
DATABASE_URL=postgresql://test:test@localhost:5432/test
JWT_SECRET=automarket_super_secret_change_me_in_production   # must match app
PORT=8080
```

---

## Production (Vercel + Render + Neon)

**Deploy order:** Neon → Render (chat-server) → Vercel

### Before first Vercel deploy — bootstrap the schema

`lib/db.ts` has `synchronize: false` in production. You must create tables first:

```bash
# Option A: point .env.local at Neon direct URL temporarily and run dev once
DATABASE_URL=<neon-direct-url>  npm run dev   # TypeORM creates tables on start

# Option B: run the existing migration against Neon
DATABASE_URL=<neon-direct-url>  npm run migration:run
```

### Vercel env vars
```
DATABASE_URL=<neon-pooled-url>?sslmode=require
JWT_SECRET=<same-as-render>
JWT_EXPIRES_IN=7d
NEXT_PUBLIC_WS_URL=wss://<chat>.onrender.com
NODE_ENV=production
```

### Render env vars (chat-server, root dir: `chat-server/`)
```
DATABASE_URL=<neon-direct-url>?sslmode=require
JWT_SECRET=<same-as-vercel>
PORT=   # injected by Render automatically
```

---

## Known issue: route conflict

`app/(public)/page.tsx` and `app/page.tsx` both map to `/`. If `next build` errors with "Multiple pages for the same route", **delete `app/(public)/page.tsx`** — the home page is at `app/page.tsx`.

---

## Architecture

```
app/                   Next.js App Router
  api/                 Route Handlers (JWT auth via jose + cookie)
  (auth)/              login, register pages
  (private)/           meus-anuncios, novo-anuncio, mensagens (JWT-guarded by middleware.ts)
  (public)/            vehicle detail page
  page.tsx             home — listing + filters
lib/
  db.ts                TypeORM DataSource singleton (global.__dataSource)
  auth.ts              signJwt / verifyJwt / requireAuth (all async, jose)
  axios.ts             Axios instance with 401 interceptor
middleware.ts          Edge JWT guard — redirects (private) routes + returns 401 for API
hooks/
  useVeiculos.ts       useInfiniteQuery — paginated listing with filters
  useVeiculo.ts        useQuery — single vehicle
  useChat.ts           WebSocket + query cache integration + exponential backoff reconnect
components/
  ChatPanel.tsx        Real-time chat UI — sends via WS, displays history from query cache
  Galeria.tsx          Image gallery with lightbox
  VeiculoCard.tsx      Vehicle listing card
  VeiculoFiltros.tsx   Filter form
  ui/                  shadcn-style components (Button, Input, Card, Badge, …)
chat-server/           Standalone Node.js + ws WebSocket server (deploy on Render)
  src/index.ts         HTTP server + WSS, heartbeat, auth via subprotocol token
  src/rooms.ts         Room map + broadcast + user→socket registry
  src/db.ts            TypeORM DataSource (synchronize:false, single connection)
  entities/            Verbatim copies of usuario.entity.ts + mensagem.entity.ts
```
