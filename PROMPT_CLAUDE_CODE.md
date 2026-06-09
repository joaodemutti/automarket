# Prompt – Claude Code: AutoMarket

Você vai construir do zero o projeto **AutoMarket**, uma plataforma de compra e venda de veículos usados com chat em tempo real. Siga rigorosamente tudo que está especificado abaixo. Não tome decisões arquiteturais que contrariem este documento.

---

## Stack obrigatória

### Back-end (app Next.js)
- **Next.js 14+ App Router** – toda a API dentro de `app/api/` usando Route Handlers
- **TypeORM** com **PostgreSQL**
- **JWT** – autenticação stateless via cookie `HttpOnly; Secure; SameSite=Strict; Path=/`
- **bcrypt** – hash de senhas
- **next-swagger-doc** + **swagger-ui-react** – documentação em `/api/docs`

### Chat server (serviço separado em `chat-server/`)
- **Node.js puro + ws** – servidor WebSocket standalone, sem framework
- **TypeORM** – mesmo ORM, conectando ao **mesmo PostgreSQL** (`DATABASE_URL`)
- **jsonwebtoken** – verificação do token no handshake com o mesmo `JWT_SECRET`
- Deploy independente no **Render** (root directory `chat-server/`)

### Front-end
- **ShadcnUI + TailwindCSS** – todos os componentes visuais
- **Axios** – instância única criada com `axios.create({ baseURL: '/api' })` em `lib/axios.ts`
- **TanStack Query (React Query v5)** – toda busca de dados server-side; `useInfiniteQuery` para listagem de veículos; `useMutation` para uploads, compra e envio de mensagens
- **WebSocket nativo do browser** – apenas para o chat em tempo real, conectando em `process.env.NEXT_PUBLIC_WS_URL`

---

## Entities (já existem no projeto – NÃO recriar, apenas importar)

```typescript
// entities/usuario.entity.ts
Usuario: id (uuid PK), login (varchar), senha (varchar), nome (varchar), criadoEm (timestamp), deletadoEm (timestamp nullable)

// entities/veiculo.entity.ts
Veiculo: id (uuid PK), idComprador (uuid nullable), idVendedor (uuid), valor (decimal),
         descricao (varchar), modelo (varchar), ano (integer), cor (varchar), marca (varchar),
         motorizacao (varchar), quilometragem (integer), vendidoEm (timestamp nullable),
         criadoEm (timestamp), deletadoEm (timestamp nullable)

// entities/imagem.entity.ts
Imagem: id (uuid PK), idVeiculo (uuid), conteudo (bytea), criadoEm (timestamp), deletadoEm (timestamp nullable)

// entities/mensagem.entity.ts
Mensagem: id (uuid PK), mensagem (varchar), idRemetente (uuid), idDestinatario (uuid),
          idVeiculo (uuid), criadoEm (timestamp)
          @ManyToOne → Usuario (remetente, JoinColumn: IdRemetente)
```

No `chat-server/`, copiar `mensagem.entity.ts` e `usuario.entity.ts` para `chat-server/entities/` **sem alterações** (o serviço tem build próprio e não pode importar fora da sua pasta).

---

## Estrutura de pastas obrigatória

```
/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   ├── register/route.ts
│   │   │   ├── logout/route.ts
│   │   │   └── ws-token/route.ts         (GET token efêmero para handshake WS)
│   │   ├── veiculos/
│   │   │   ├── route.ts                  (GET listagem paginada + filtros, POST cadastro)
│   │   │   └── [id]/
│   │   │       ├── route.ts              (GET detalhes, DELETE soft-delete)
│   │   │       ├── imagens/route.ts      (GET galeria, POST upload)
│   │   │       ├── compra/route.ts       (POST solicitar/confirmar compra)
│   │   │       └── mensagens/route.ts    (GET histórico do chat)
│   │   ├── usuarios/
│   │   │   └── [id]/route.ts             (GET perfil público)
│   │   └── docs/route.ts                 (Swagger UI)
│   ├── (public)/
│   │   ├── page.tsx                      (home: listagem + filtros)
│   │   └── veiculos/[id]/page.tsx        (detalhes + galeria + chat)
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   └── (private)/
│       ├── meus-anuncios/page.tsx
│       ├── novo-anuncio/page.tsx
│       └── mensagens/page.tsx            (lista de conversas do usuário logado)
├── lib/
│   ├── db.ts                             (DataSource TypeORM — singleton)
│   ├── auth.ts                           (signJwt, verifyJwt, setCookie, clearCookie, signWsToken)
│   └── axios.ts                          (instância Axios)
├── entities/                             (não modificar)
├── hooks/
│   ├── useVeiculos.ts                    (useInfiniteQuery)
│   ├── useVeiculo.ts                     (useQuery por id)
│   └── useChat.ts                        (WS + queryClient.setQueryData para histórico)
├── components/
│   ├── ui/                               (shadcn — não modificar manualmente)
│   ├── VeiculoCard.tsx
│   ├── VeiculoFiltros.tsx
│   ├── Galeria.tsx
│   └── ChatPanel.tsx
├── chat-server/                          (serviço separado — package.json próprio)
│   ├── src/
│   │   ├── index.ts                      (HTTP server + WebSocketServer + GET /health)
│   │   ├── db.ts                         (DataSource TypeORM)
│   │   ├── auth.ts                       (verifyJwt)
│   │   └── rooms.ts                      (Map de rooms, join/leave/broadcast)
│   ├── entities/                         (cópia de mensagem e usuario — não modificar)
│   ├── package.json
│   └── tsconfig.json
└── middleware.ts                         (valida JWT cookie e redireciona rotas privadas)
```

---

## Autenticação – implementação detalhada

1. `POST /api/auth/register` — recebe `{ login, senha, nome }`, hash com bcrypt (salt 10), salva `Usuario`, retorna `201`
2. `POST /api/auth/login` — verifica login/senha com `bcrypt.compare`, assina JWT com `JWT_SECRET` e `JWT_EXPIRES_IN`, seta cookie:
   ```
   Set-Cookie: token=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=<segundos>
   ```
3. `POST /api/auth/logout` — seta o mesmo cookie com `Max-Age=0`
4. `GET /api/auth/ws-token` — exige auth via cookie (`requireAuth`); retorna `{ token }`: JWT efêmero com payload `{ id, nome }`, **expiração de 60 segundos**, assinado com o mesmo `JWT_SECRET`. Usado exclusivamente no subprotocolo do handshake do WebSocket (o cookie é HttpOnly e o JS do browser não consegue lê-lo)
5. `middleware.ts` — lê `request.cookies.get('token')`, verifica com `verifyJwt`; redireciona para `/login` se inválido nas rotas `(private)` e `/api/` que exigem auth

Helper `auth.ts` deve exportar:
```typescript
export function requireAuth(request: NextRequest): { id: string; nome: string } // lança 401 se inválido
export function signWsToken(payload: { id: string; nome: string }): string     // expiresIn: '60s'
```

---

## Chat server – implementação detalhada (`chat-server/`)

Serviço Node.js independente. O app Next.js **não** roda nenhum servidor WebSocket — não criar `instrumentation.ts` nem anexar nada ao server do Next.

### `src/index.ts`
- `http.createServer` com `GET /health` → `200 ok`
- `new WebSocketServer({ server })` da lib `ws` (`npm install ws jsonwebtoken typeorm pg reflect-metadata`)
- **Inicializar o `DataSource` UMA vez** com `await AppDataSource.initialize()` antes de `server.listen` — reusar o repositório; nunca conectar por mensagem
- DataSource com `ssl: { rejectUnauthorized: false }` (Neon exige SSL) e **`synchronize: false`** (o chat-server nunca altera o schema)
- Ler a porta de `process.env.PORT` (o Render injeta) — não hardcodar 8080 em produção
- **Heartbeat:** a cada 30s, `ws.ping()` em cada socket; marcar `isAlive=false` antes do ping e `true` no evento `pong`; encerrar (`ws.terminate()`) sockets que não responderam. Sem isso o proxy do Render e o Neon derrubam conexões idle silenciosamente

### Autenticação da conexão
- O token é o JWT efêmero de `GET /api/auth/ws-token`, enviado pelo cliente no **subprotocolo** do WebSocket — NUNCA em query param nem em cookie
- Cliente abre: `new WebSocket(WS_URL, ['auth', token])` → o token chega no header `Sec-WebSocket-Protocol`
- No `WebSocketServer`, usar `handleProtocols` para **devolver** o label `'auth'` (obrigatório: se o servidor não ecoar um subprotocolo oferecido, o browser encerra a conexão logo após abrir):
  ```ts
  handleProtocols: (protocols) => (protocols.has('auth') ? 'auth' : false)
  ```
- No evento `connection`, ler `req.headers['sec-websocket-protocol']`, separar por vírgula e pegar o segundo valor (o JWT). Verificar com `JWT_SECRET`; se inválido/expirado, `ws.close(4401, 'unauthorized')`
- Guardar `{ id, nome }` do payload no contexto do socket

### Rooms (`src/rooms.ts`)
- Chave = `${idVeiculo}:${[idA,idB].sort().join(':')}` — garante mesma room independente da ordem
- `Map<string, Set<WebSocket>>` + registro de qual usuário está em qual socket

### Ao receber mensagem do cliente
1. Validar payload `{ idDestinatario, idVeiculo, mensagem }`
2. **`idRemetente` vem SEMPRE do token autenticado do socket, nunca do payload do cliente** (senão um usuário pode forjar mensagens como outro)
3. Persistir na tabela `Mensagem` via TypeORM (mesma entity, mesmo banco do app)
4. Fazer broadcast para todos os sockets da room com:
   ```json
   { "type": "message", "data": { /* objeto Mensagem completo com remetente { id, nome } */ } }
   ```
5. Se o destinatário tiver sockets conectados fora da room, enviar:
   ```json
   { "type": "notification" }
   ```
   (sem contagem de não lidas — a entity `Mensagem` não tem campo de leitura; fora do escopo)

### Deploy (Render)
- Web Service, root directory `chat-server/`, build `npm install && npm run build`, start `npm start`
- Envs: `DATABASE_URL` (string **direct** do Neon, sem pooler, com `sslmode=require`), `JWT_SECRET` (**obrigatoriamente o mesmo do app**), `PORT` (Render injeta)

---

## Configuração TypeORM + Next.js (atenção — falhas comuns em produção)

- Ambos os `tsconfig.json` (app e chat-server) precisam de `"experimentalDecorators": true` e `"emitDecoratorMetadata": true`, e importar `reflect-metadata` no topo do entrypoint
- `lib/db.ts` (app) e `chat-server/src/db.ts`: DataSource com `ssl: { rejectUnauthorized: false }` — **Neon exige SSL**, sem isso a conexão falha em produção
- `synchronize`: `true` apenas em desenvolvimento no app, para criar as tabelas no Neon uma vez; depois desligar. **Chat-server sempre `synchronize: false`**
- `next.config.js`: incluir `serverExternalPackages: ['typeorm']` (Next 15) ou `experimental.serverComponentsExternalPackages: ['typeorm']` (Next 14) — senão o build da Vercel quebra ao empacotar o TypeORM
- App na Vercel usa a connection string **pooled** do Neon (host com `-pooler`); chat-server usa a **direct**

---

## API – especificações obrigatórias

### `GET /api/veiculos` — paginação e filtros

Query params:

| Param | Tipo | Default | Observação |
|-------|------|---------|-----------|
| `page` | integer | 1 | |
| `limit` | integer | 12 | máximo 48 |
| `marca` | string | — | filtro exato |
| `modelo` | string | — | ILIKE `%valor%` |
| `cor` | string | — | filtro exato |
| `anoMin` | integer | — | inclusive |
| `anoMax` | integer | — | inclusive |
| `valorMin` | number | — | inclusive |
| `valorMax` | number | — | inclusive |
| `quilometragemMax` | integer | — | inclusive |

Usar `createQueryBuilder` para aplicar filtros condicionalmente. **Sempre** aplicar `.andWhere('veiculo.vendidoEm IS NULL').andWhere('veiculo.deletadoEm IS NULL')`.

**NUNCA** fazer `find()` sem `take`. Sempre usar `skip` e `take`.

Response obrigatório:
```json
{
  "data": [ /* veículos sem o campo conteudo das imagens */ ],
  "meta": { "total": 142, "page": 1, "limit": 12, "totalPages": 12 }
}
```

### `POST /api/veiculos` — cadastro
- Auth obrigatória; `idVendedor` = id do usuário logado
- Body: multipart/form-data com campos do veículo + **ao menos 1 arquivo de imagem**
- Rejeitar com `400` se nenhuma imagem for enviada
- Salvar cada imagem como `Buffer` no campo `conteudo (bytea)` da tabela `Imagem`
- `criadoEm` setado pelo servidor, nunca pelo cliente

### `GET /api/veiculos/:id/imagens`
- Retornar imagens como base64: `{ id, conteudo: buffer.toString('base64'), criadoEm }`

### `POST /api/veiculos/:id/imagens`
- Auth obrigatória; apenas o dono (`idVendedor === usuarioLogado.id`)
- multipart/form-data com 1+ arquivos; salvar cada um como `Buffer` em `conteudo (bytea)`
- Rejeitar `403` se não for o dono, `404` se o veículo não existir

### `POST /api/veiculos/:id/compra`
- Auth obrigatória
- Verificar que `vendidoEm IS NULL` e `idComprador IS NULL` — se já vendido, retornar `409`
- Setar `idComprador = usuarioLogado.id` e `vendidoEm = new Date()` atomicamente
- Usar transaction TypeORM para evitar race condition

### `DELETE /api/veiculos/:id`
- Soft-delete: setar `deletadoEm = new Date()`
- Apenas o próprio vendedor (`idVendedor === usuarioLogado.id`) pode deletar

### `GET /api/veiculos/:id/mensagens`
- Auth obrigatória
- Retornar mensagens onde `idVeiculo = :id` e (`idRemetente = usuarioLogado.id` OR `idDestinatario = usuarioLogado.id`)
- Eager load do `remetente` (apenas `id` e `nome`)
- Ordenar por `criadoEm ASC`

---

## Front-end – implementação detalhada

### `lib/axios.ts`
```typescript
import axios from 'axios'
export const api = axios.create({ baseURL: '/api' })
// interceptor: em 401, redirecionar para /login
```

### `hooks/useVeiculos.ts`
```typescript
// useInfiniteQuery com getNextPageParam baseado em meta.page e meta.totalPages
// params de filtro como queryKey para invalidação automática ao mudar filtros
```

### `hooks/useChat.ts`
```typescript
// 1. useQuery para buscar histórico via GET /api/veiculos/:id/mensagens
// 2. useEffect: buscar token via GET /api/auth/ws-token (Axios), então abrir
//    new WebSocket(process.env.NEXT_PUBLIC_WS_URL, ['auth', token])
//    (token vai no subprotocolo, NUNCA em query param)
// 3. onmessage: se type === 'message', chamar queryClient.setQueryData para inserir no cache
// 4. Fechar WS no cleanup do useEffect
// 5. onclose: reconectar com backoff (ex. 1s, 2s, 4s, máx 10s), buscando NOVO
//    ws-token a cada tentativa (expira em 60s). Cobre cold-start do Render free tier (~30-50s)
```

### `components/ChatPanel.tsx`
- Exibir histórico de mensagens com scroll automático para o final
- Input + botão enviar; ao enviar, mandar via WS (não via Axios)
- Mostrar badge de notificação no ícone de chat quando chegar evento `type: 'notification'`

### `components/VeiculoFiltros.tsx`
- Formulário com campos para todos os filtros do `GET /api/veiculos`
- Ao submeter, atualizar URL params e invalidar query do React Query

### `components/Galeria.tsx`
- Receber array de `{ id, conteudo: string (base64) }`
- Renderizar com `<img src={`data:image/jpeg;base64,${conteudo}`} />`
- Lightbox simples ao clicar

---

## Regras de negócio críticas

1. **Compra única com transaction:** usar `dataSource.transaction(async manager => { ... })` ao confirmar compra para evitar dois compradores simultâneos
2. **Soft-delete em cascata:** toda query de listagem/busca deve filtrar `deletadoEm IS NULL` — veículos, usuários e imagens
3. **Imagem obrigatória:** validar no `POST /api/veiculos` antes de salvar qualquer dado
4. **Eager load controlado:** carregar `remetente` apenas no endpoint de histórico de mensagens, nunca na listagem geral

---

## Variáveis de ambiente

### App Next.js (`.env.local`)
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/automarket
JWT_SECRET=sua_chave_secreta_aqui
JWT_EXPIRES_IN=7d
NEXT_PUBLIC_WS_URL=ws://localhost:8080
NODE_ENV=development
```

### Chat server (`chat-server/.env`)
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/automarket
JWT_SECRET=sua_chave_secreta_aqui   # mesmo valor do app
PORT=8080
```

### Produção (Vercel + Render + Neon)
- Ordem de deploy: **Neon** (criar banco) → **Render** (chat-server, obter a URL `onrender.com`) → setar `NEXT_PUBLIC_WS_URL=wss://...onrender.com` na Vercel → **deploy Vercel**. Se a Vercel subir antes, o WS aponta para nada.
- `NEXT_PUBLIC_WS_URL` em produção deve ser `wss://` (não `ws://`) — página HTTPS não abre socket inseguro (mixed content)
- Cookie `SameSite=Strict` funciona porque frontend e API estão na mesma origem (Vercel). Não separar em domínios diferentes.

---

## Swagger

Documentar **todos** os endpoints com JSDoc no padrão `next-swagger-doc`. Incluir:
- Schemas de request/response
- Códigos de erro possíveis (400, 401, 403, 404, 409)
- Indicação de quais rotas exigem autenticação

---

## Paralelização (se usar múltiplos agentes)

Os tracks abaixo são independentes entre si após o track A estar pronto:

- **Track A (base, sequencial):** setup do projeto + `lib/db.ts` + `lib/auth.ts` + endpoints de auth + `middleware.ts`
- **Track B:** endpoints de veículos, imagens e compra + Swagger
- **Track C:** `chat-server/` completo (só depende do `JWT_SECRET` e das entities copiadas — não toca no app Next)
- **Track D:** front-end (layout, páginas, hooks, componentes) — pode mockar contra o contrato da API definido aqui

Pontos de integração no final: `useChat` ↔ chat-server (ws-token) e `GET /api/veiculos/:id/mensagens` ↔ histórico.

---

## Ordem de implementação sugerida (se sequencial)

1. Configurar projeto Next.js + instalar dependências + configurar TailwindCSS + ShadcnUI
2. `lib/db.ts` — DataSource TypeORM conectando ao PostgreSQL
3. `lib/auth.ts` — JWT helpers (incluindo `signWsToken`)
4. Endpoints de auth (`register`, `login`, `logout`, `ws-token`) + `middleware.ts`
5. Endpoints de veículos (CRUD + paginação + filtros)
6. Endpoint de imagens (upload + listagem)
7. Endpoint de compra (com transaction)
8. `chat-server/` — serviço completo (db, auth, rooms, index, health)
9. Endpoint de mensagens (histórico)
10. Front-end: layout base + ShadcnUI + Axios + QueryClient provider
11. Páginas públicas: home (listagem + filtros) + detalhes do veículo
12. Páginas de auth: login + register
13. Páginas privadas: meus anúncios + novo anúncio + mensagens
14. Hooks: `useVeiculos`, `useVeiculo`, `useChat`
15. Componentes: `VeiculoCard`, `VeiculoFiltros`, `Galeria`, `ChatPanel`
16. Swagger — documentar todos os endpoints
17. Testes manuais de todos os fluxos (incluindo chat com dois usuários em dois browsers)

---

## O que NÃO fazer

- Não usar `fetch` diretamente no front-end — sempre usar a instância Axios de `lib/axios.ts`
- Não usar `localStorage` para armazenar o JWT nem o ws-token — o cookie HttpOnly é a única fonte de autenticação; o ws-token é buscado sob demanda a cada conexão
- Não criar `instrumentation.ts` nem anexar WebSocket ao servidor do Next.js — o chat roda exclusivamente no serviço `chat-server/`
- Não retornar o campo `senha` do `Usuario` em nenhum endpoint
- Não retornar o campo `conteudo` (bytea) na listagem de veículos — apenas no endpoint de imagens
- Não fazer `find()` sem `take` na listagem de veículos
- Não criar a entity `Avaliacao` — está fora do escopo
- Não usar `socket.io` — usar a lib `ws` nativa
- Não duplicar a entity `Veiculo` nem `Imagem` no chat-server — ele só precisa de `Mensagem` e `Usuario`
