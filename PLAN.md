# AutoMarket – Full Build Plan

## Context

Build the entire AutoMarket platform (used-car marketplace with real-time chat) from scratch, following the "Ordem de implementação sugerida" in PROMPT_CLAUDE_CODE.md. PROMPT is authoritative. SPEC is supplementary context. The entities already exist in `src/entity/` — import from there, never recreate.

---

## Critical Notes Before Writing Any Code

### Next.js 16 Breaking Changes (from node_modules/next/dist/docs/)
- **`params` in Route Handlers is a Promise**: `{ params }: { params: Promise<{ id: string }> }` → must `await params`
- **`cookies()` is async**: `const cookieStore = await cookies()` everywhere in Route Handlers and Server Components
- **`serverExternalPackages`** (not `experimental.serverComponentsExternalPackages`) in next.config.ts — stable since v15

### Entity Facts
- Entities live at `src/entity/` (not `entities/`)
- DB column names are PascalCase: `Id`, `Login`, `Senha`, `Nome`, `CriadoEm`, etc. — TypeORM maps these via `@Column({ name: '...' })`
- `Veiculo.motorizacao` maps to DB column `"Motorização"` (accented ã). In `createQueryBuilder` always use the **TypeScript property name** (`veiculo.motorizacao`) — TypeORM handles the mapping. Only raw SQL would need the quoted accented name.
- `Mensagem` has `remetente: Relation<Usuario>` via `@JoinColumn({name:"IdRemetente"})` — use `relations: ['remetente']` in find options or `.leftJoinAndSelect('mensagem.remetente', 'remetente')` in QueryBuilder
- `Imagem.conteudo` is `Buffer` / `bytea`
- The chat-server entity copies must be **character-for-character identical** to `src/entity/` — including the accented column name

### ShadcnUI + TailwindCSS v4
- Project uses Tailwind v4 (no tailwind.config.js, uses `@tailwindcss/postcss`)
- Use `npx shadcn@canary init` (canary supports Tailwind v4)
- globals.css already has Tailwind v4 setup

### TypeORM Singleton Pattern (critical for serverless)
- `lib/db.ts` must use a global singleton to prevent re-initializing DataSource on every hot-reload in Next.js dev mode
- Pattern: `global.__dataSource` cached across module reloads

---

## Packages to Install

### Root (app)
```
npm install bcrypt jose axios @tanstack/react-query next-swagger-doc swagger-ui-react
npm install -D @types/bcrypt @types/swagger-ui-react
```
> **Why `jose` instead of `jsonwebtoken`:** Next.js middleware runs on the Edge runtime by default, which does not support Node.js APIs. `jsonwebtoken` uses Node.js crypto — it will fail silently or hard on Edge. `jose` is Web-standard and works on both Edge and Node.js runtimes. The official Next.js auth guide recommends it. The chat-server is pure Node.js and can keep `jsonwebtoken`.

### ShadcnUI (interactive CLI):
```
npx shadcn@canary init
npx shadcn@canary add button input label card badge dialog scroll-area separator avatar
```

### chat-server (own package.json):
```
npm install ws jsonwebtoken typeorm pg reflect-metadata
npm install -D @types/ws @types/jsonwebtoken typescript ts-node
```

---

## Files to Create / Modify

### Step 1 – Project Setup
| File | Action |
|------|--------|
| `next.config.ts` | Add `serverExternalPackages: ['typeorm']` |
| `.env.local` | Create with DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN, NEXT_PUBLIC_WS_URL, NODE_ENV |
| `tsconfig.json` | Already has `experimentalDecorators` + `emitDecoratorMetadata` ✓ |

### Step 2 – `lib/db.ts`
TypeORM DataSource singleton. Pattern:
```ts
import 'reflect-metadata'
// Global cache to survive hot-reload
declare global { var __dataSource: DataSource | undefined }
const dataSource = global.__dataSource ?? new DataSource({ ... })
if (!global.__dataSource) global.__dataSource = dataSource
export default dataSource
export async function getDataSource(): Promise<DataSource> {
  if (!dataSource.isInitialized) await dataSource.initialize()
  return dataSource
}
```
- Import entities directly (no glob): `import { Usuario } from '../src/entity/usuario.entity'` etc.
- `ssl: { rejectUnauthorized: false }` for Neon
- `synchronize: process.env.NODE_ENV !== 'production'`
- `serverExternalPackages: ['typeorm']` in next.config.ts is required for this to work

### Step 3 – `lib/auth.ts`
Uses **`jose`** (Edge + Node.js compatible). All signing/verifying functions are `async`.

Exports:
- `signJwt(payload)` — `new SignJWT(payload).setExpirationTime(JWT_EXPIRES_IN).sign(encodedKey)`
- `verifyJwt(token): Promise<{ id: string; nome: string }>` — `jwtVerify(token, encodedKey)`; returns payload
- `setCookie(response, token)` — appends `Set-Cookie: token=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=...`
- `clearCookie(response)` — same cookie with Max-Age=0
- `requireAuth(request: NextRequest): Promise<{ id: string; nome: string }>` — reads `request.cookies.get('token')?.value`, calls verifyJwt, returns 401 Response if missing/invalid
- `signWsToken(payload)` — `expiresIn: '60s'`, same `encodedKey`

Note: In Route Handlers, read cookies via `request.cookies.get('token')` (NextRequest `.cookies` is sync). The `await cookies()` from `next/headers` is for Server Components only.

### Step 4 – `lib/axios.ts`
```ts
import axios from 'axios'
export const api = axios.create({ baseURL: '/api' })
// interceptor: on 401 redirect to /login (window.location.href)
```

### Step 5 – `middleware.ts`
- Runs on **Edge runtime** (default). Uses `jose`'s `jwtVerify` directly (not the `lib/auth.ts` wrapper, to avoid importing server-only modules)
- Read `request.cookies.get('token')?.value`
- `await jwtVerify(token, encodedKey)` — `encodedKey = new TextEncoder().encode(process.env.JWT_SECRET)`
- Protected matchers: `/(private)/:path*` and specific `/api/` routes that require auth
- Redirect to `/login` if invalid for page routes; return 401 JSON for API routes
- Use `NextResponse.next()` for valid / public routes

### Step 6 – Auth Endpoints
**`app/api/auth/register/route.ts`** — POST
- Body: `{ login, senha, nome }`
- Hash senha with bcrypt salt 10
- Set `criadoEm = new Date()`
- Return 201

**`app/api/auth/login/route.ts`** — POST
- bcrypt.compare, signJwt, setCookie, return user without senha

**`app/api/auth/logout/route.ts`** — POST
- clearCookie, return 200

**`app/api/auth/ws-token/route.ts`** — GET
- requireAuth from cookie
- signWsToken({ id, nome }) with 60s expiry
- Return `{ token }`

### Step 7 – Veículos Endpoints

**`app/api/veiculos/route.ts`**
- GET: `createQueryBuilder`, conditional filters, always `.andWhere('veiculo.vendidoEm IS NULL').andWhere('veiculo.deletadoEm IS NULL')`, `skip`/`take`, return `{ data, meta }`; never return `conteudo` field
- POST: `requireAuth`, multipart `request.formData()`, reject 400 if no images, save Veiculo then Imagens

**`app/api/veiculos/[id]/route.ts`**
- GET: detalhes (deletadoEm IS NULL)
- DELETE: soft-delete — only idVendedor, set `deletadoEm = new Date()`
- `const { id } = await params` (Next 16 async params)

**`app/api/veiculos/[id]/imagens/route.ts`**
- GET: base64 encode `conteudo`, return `{ id, conteudo: buffer.toString('base64'), criadoEm }`
- POST: requireAuth + ownership check (403/404), save Buffer

**`app/api/veiculos/[id]/compra/route.ts`** — POST
- requireAuth
- `dataSource.transaction(async manager => { ... })` — SELECT FOR UPDATE style:
  1. Find veiculo with `manager.findOne` and check `vendidoEm IS NULL && idComprador IS NULL`, else 409
  2. Set `idComprador = user.id, vendidoEm = new Date()`, save

**`app/api/veiculos/[id]/mensagens/route.ts`** — GET
- requireAuth
- Query with `idVeiculo = :id AND (idRemetente = :uid OR idDestinatario = :uid)`
- Eager load remetente (id, nome only)
- Order by criadoEm ASC

### Step 8 – Usuários
**`app/api/usuarios/[id]/route.ts`** — GET
- Return public profile (never senha)

### Step 9 – Swagger
**`app/api/docs/route.ts`**
- Use `next-swagger-doc` to generate spec from JSDoc
- Return swagger-ui-react rendered page
- All endpoints documented with request/response schemas and error codes

### Step 10 – Chat Server (`chat-server/`)
Independent Node.js service. Never imports from outside `chat-server/`.

**`chat-server/package.json`**
```json
{
  "name": "chat-server",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts"
  }
}
```

**`chat-server/tsconfig.json`**
- `experimentalDecorators: true`, `emitDecoratorMetadata: true`
- `outDir: ./dist`

**`chat-server/entities/`** — copy `usuario.entity.ts` and `mensagem.entity.ts` verbatim from `src/entity/`

**`chat-server/src/db.ts`**
- AppDataSource with `synchronize: false`, `ssl: { rejectUnauthorized: false }`
- Entities: `[Usuario, Mensagem]` (direct imports)

**`chat-server/src/auth.ts`**
- `verifyJwt(token)` using `jsonwebtoken.verify(token, JWT_SECRET)`

**`chat-server/src/rooms.ts`**
- `Map<string, Set<ExtendedWebSocket>>`
- Room key: `${idVeiculo}:${[idA,idB].sort().join(':')}`
- `joinRoom(roomKey, ws)`, `leaveRoom(roomKey, ws)`, `broadcast(roomKey, data, excludeWs?)`
- Track which `userId` each socket belongs to for notifications

**`chat-server/src/index.ts`**
1. `import 'reflect-metadata'`
2. `http.createServer` with `GET /health → 200`
3. `new WebSocketServer({ server, handleProtocols: (p) => p.has('auth') ? 'auth' : false })`
4. `await AppDataSource.initialize()` BEFORE `server.listen`
5. Port from `process.env.PORT`
6. On `connection`: read `req.headers['sec-websocket-protocol']`, split by `,`, grab token (index 1), verifyJwt; close 4401 if invalid; store `{ id, nome }` on socket
7. On `message`: parse JSON `{ idDestinatario, idVeiculo, mensagem }`, idRemetente = socket.user.id, save Mensagem entity, broadcast to room, notify if destinatario connected elsewhere
8. Heartbeat: `setInterval(30000)` — ping all, terminate non-responsive

### Step 11 – Frontend Layout & Providers

**`app/layout.tsx`** — add `<QueryClientProvider>` wrapping children (client component wrapper)

**`components/providers.tsx`** — `'use client'` QueryClientProvider with `new QueryClient()`

**`app/globals.css`** — already has TailwindCSS v4 setup; add shadcn CSS variables as needed

### Step 12 – Pages

**`app/(public)/page.tsx`** — home: `<VeiculoFiltros>` + `<VeiculoCard>` grid using `useVeiculos` hook

**`app/(public)/veiculos/[id]/page.tsx`** — details: `useVeiculo`, `<Galeria>`, buy button, `<ChatPanel>`

**`app/(auth)/login/page.tsx`** — login form, POST /api/auth/login, redirect on success

**`app/(auth)/register/page.tsx`** — register form, POST /api/auth/register

**`app/(private)/meus-anuncios/page.tsx`** — list seller's vehicles

**`app/(private)/novo-anuncio/page.tsx`** — form with multipart POST /api/veiculos

**`app/(private)/mensagens/page.tsx`** — list conversations for logged-in user

### Step 13 – Hooks

**`hooks/useVeiculos.ts`**
```ts
useInfiniteQuery({
  queryKey: ['veiculos', filters],
  queryFn: ({ pageParam = 1 }) => api.get('/veiculos', { params: { ...filters, page: pageParam } }).then(r => r.data),
  getNextPageParam: (last) => last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
  initialPageParam: 1
})
```

**`hooks/useVeiculo.ts`** — `useQuery` by id

**`hooks/useChat.ts`**
1. `useQuery` for history via GET `/veiculos/:id/mensagens`
2. `useEffect`: GET ws-token via Axios → `new WebSocket(NEXT_PUBLIC_WS_URL, ['auth', token])`
3. `onmessage`: if `type === 'message'` → `queryClient.setQueryData` insert into history cache
4. Cleanup: `ws.close()` in effect cleanup
5. `onclose`: reconnect with exponential backoff (1s, 2s, 4s, max 10s), fetch new ws-token each time

### Step 14 – Components

**`components/VeiculoCard.tsx`** — shadcn Card, vehicle summary, link to detail page

**`components/VeiculoFiltros.tsx`** — form with all filter fields; on submit updates URL params + invalidates query

**`components/Galeria.tsx`** — `<img src={`data:image/jpeg;base64,${conteudo}`}>`, simple lightbox on click

**`components/ChatPanel.tsx`**
- Display message history, scroll to bottom automatically
- Input + send button; send via WS (not Axios)
- Badge notification when `type === 'notification'`
- Export `sendMessage(ws, payload)` helper

---

## Route Groups & Middleware Matcher

```ts
// middleware.ts matcher
export const config = {
  matcher: ['/(private)/:path*', '/api/veiculos/:path*/compra', '/api/veiculos/:path*/mensagens', '/api/auth/ws-token', '/api/veiculos'],
}
```

Redirect pages → `/login`; for API routes return `Response.json({ error: 'Unauthorized' }, { status: 401 })`.

---

## Verification

1. Start Docker PostgreSQL: `docker compose up -d`
2. Start Next.js app: `npm run dev` (port 3000). On first run, TypeORM `synchronize: true` creates tables.
3. Start chat server: `cd chat-server && npm run dev` (port 8080)
4. Open two browsers → register two users → create a vehicle listing → open chat from both → verify real-time messages appear on both sides
5. Test purchase flow: buy vehicle → verify it disappears from listing
6. Test image upload: create listing with multiple images → verify gallery renders
7. Visit `/api/docs` → verify Swagger UI loads with all endpoints
8. Test reconnection: kill chat-server → restart → verify client reconnects automatically

## README Note — Production DB Sync

`lib/db.ts` sets `synchronize: process.env.NODE_ENV !== 'production'`. Before the **first production deploy to Vercel + Neon**, you must create the tables by running the app once locally against the Neon database (temporarily set `DATABASE_URL` to the Neon connection string in `.env.local` while `NODE_ENV` is still `development`), or run the migration: `npm run migration:run` pointing at Neon's direct URL. After tables exist, `synchronize: false` in production is safe.
