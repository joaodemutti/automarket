# AutoMarket – Especificação do Projeto

## Visão Geral

Plataforma de compra e venda de veículos usados com chat em tempo real entre compradores e vendedores e galeria de imagens por anúncio.

---

## Stack Tecnológica

### Back-end (dentro do próprio Next.js)
- **Next.js App Router** – API Routes em `app/api/`
- **TypeORM** – ORM com PostgreSQL
- **PostgreSQL** – banco de dados relacional
- **JWT** – autenticação stateless via cookie `HttpOnly`
- **Swagger (swagger-jsdoc + swagger-ui-express ou next-swagger-doc)** – documentação da API

### Chat Server (serviço separado – `chat-server/`)
- **Node.js + ws** – servidor WebSocket standalone (sem framework)
- **TypeORM** – mesmo ORM, conectando ao mesmo PostgreSQL (`DATABASE_URL`)
- **JWT** – verificação no handshake com o mesmo `JWT_SECRET` do app
- **Deploy: Render** (Web Service com root directory `chat-server/`; Render suporta WebSocket nativamente)

### Infra de deploy (produção)
- **Vercel** – app Next.js (frontend + API routes), origem única
- **Render** – chat-server (WebSocket), origem separada com TLS (`wss://`)
- **Neon** – PostgreSQL serverless, compartilhado pelos dois serviços; exige SSL e oferece connection string *pooled* (para o app serverless) e *direct* (para o chat-server long-running)

### Front-end
- **Next.js** – SSR / RSC onde aplicável
- **ShadcnUI + TailwindCSS** – componentes e estilização
- **Axios** – instância criada com `axios.create({ baseURL: '/api' })`
- **TanStack Query (React Query)** – cache, loading/error states, invalidação após mutations
- **WebSocket nativo do browser** – consumo do chat em tempo real (conecta no chat-server via `NEXT_PUBLIC_WS_URL`)

---

## Models (já existentes)

```
Usuario       → id, login, senha, nome, criadoEm, deletadoEm
Veiculo       → id, idComprador?, idVendedor, valor, descricao, modelo,
                ano, cor, marca, motorizacao, quilometragem,
                vendidoEm?, criadoEm, deletadoEm
Imagem        → id, idVeiculo, conteudo (bytea), criadoEm, deletadoEm
Mensagem      → id, mensagem, idRemetente, idDestinatario, idVeiculo,
                criadoEm  (+relation remetente → Usuario)
```

---

## Requisitos Funcionais

| ID | Descrição |
|----|-----------|
| RF01 | Cadastro de veículos (vendedor autenticado) |
| RF02 | Listagem de veículos disponíveis |
| RF03 | Busca e filtros de veículos (marca, modelo, ano, cor, faixa de valor, quilometragem) |
| RF04 | Visualização de detalhes do veículo |
| RF05 | Galeria de imagens por anúncio |
| RF06 | Chat entre comprador e vendedor via WebSocket |
| RF07 | Histórico de mensagens por conversa (idVeiculo + par de usuários) |
| RF08 | Notificação de novas mensagens (badge em tempo real via WS) |
| RF12 | Solicitação de compra de veículo (comprador marca interesse, vendedor confirma) |

---

## Requisitos Não Funcionais

| ID | Descrição |
|----|-----------|
| RNF1 | Cada veículo pode ser comprado por apenas um comprador (campo `idComprador` único por veículo) |
| RNF3 | O chat deve permitir envio e recebimento imediato de mensagens (WebSocket) |
| RNF4 | O histórico das conversas deve ser persistido no banco (tabela `Mensagem`) |
| RNF5 | Apenas veículos não vendidos (`vendidoEm IS NULL` e `deletadoEm IS NULL`) devem aparecer nas buscas |
| RNF6 | Cada anúncio deve ter ao menos uma imagem no momento do cadastro |

---

## Arquitetura de Pastas

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
│   │   │   ├── route.ts                  (GET listagem/filtros, POST cadastro)
│   │   │   └── [id]/
│   │   │       ├── route.ts              (GET detalhes, DELETE soft-delete)
│   │   │       ├── imagens/route.ts      (GET galeria, POST upload)
│   │   │       ├── compra/route.ts       (POST solicitar compra)
│   │   │       └── mensagens/route.ts    (GET histórico)
│   │   ├── usuarios/
│   │   │   └── [id]/
│   │   │       └── route.ts              (GET perfil público)
│   │   └── docs/route.ts                 (Swagger UI)
│   ├── (public)/
│   │   ├── page.tsx                      (home / listagem)
│   │   └── veiculos/[id]/page.tsx        (detalhes + galeria + chat)
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   └── (private)/
│       ├── meus-anuncios/page.tsx
│       ├── novo-anuncio/page.tsx
│       └── mensagens/page.tsx            (lista de conversas)
├── lib/
│   ├── db.ts                             (DataSource TypeORM)
│   ├── auth.ts                           (sign/verify JWT, set/clear cookie)
│   └── axios.ts                          (instância Axios com baseURL='/api')
├── entities/                             (models já fornecidos)
├── hooks/
│   ├── useVeiculos.ts                    (React Query)
│   ├── useVeiculo.ts
│   └── useChat.ts                        (WebSocket + React Query para histórico)
├── components/
│   ├── ui/                               (shadcn)
│   ├── VeiculoCard.tsx
│   ├── VeiculoFiltros.tsx
│   ├── Galeria.tsx
│   └── ChatPanel.tsx
├── chat-server/                          (serviço separado — deploy no Render)
│   ├── src/
│   │   ├── index.ts                      (HTTP server + WSS + GET /health)
│   │   ├── db.ts                         (DataSource TypeORM — mesmo DATABASE_URL)
│   │   ├── auth.ts                       (verifyJwt com o mesmo JWT_SECRET)
│   │   └── rooms.ts                      (gerência de rooms e broadcast)
│   ├── entities/                         (cópia de mensagem.entity.ts e usuario.entity.ts)
│   ├── package.json
│   └── tsconfig.json
└── middleware.ts                         (proteção de rotas via JWT cookie)
```

---

## Autenticação

- **Fluxo:** `POST /api/auth/login` → verifica login/senha → assina JWT → seta cookie `HttpOnly; Secure; SameSite=Strict; Path=/`
- O cookie `SameSite=Strict` funciona porque frontend e API ficam na **mesma origem** (ambos na Vercel). Não separar o frontend da API em domínios diferentes, senão o cookie deixa de ser enviado.
- **Middleware Next.js** lê o cookie, verifica o token e redireciona se inválido
- **Logout:** `POST /api/auth/logout` → limpa o cookie
- Senha armazenada com **bcrypt**
- **WS token:** como o cookie é `HttpOnly`, o JavaScript do browser não consegue lê-lo, e o construtor `WebSocket` do browser não aceita headers customizados. O endpoint `GET /api/auth/ws-token` (auth via cookie) retorna `{ token }` — um JWT efêmero (60s) com `{ id, nome }`, assinado com o mesmo `JWT_SECRET`, enviado no subprotocolo do handshake WS

---

## WebSocket – Chat (serviço `chat-server/`)

- Serviço Node.js standalone na pasta `chat-server/`, deploy independente no Render; o app Next.js **não** roda servidor WebSocket
- Cada conexão WS é autenticada via token efêmero enviado no **subprotocolo** do WebSocket (`new WebSocket(url, ['auth', token])`), obtido em `GET /api/auth/ws-token`; o servidor lê o token do header `Sec-WebSocket-Protocol`, ecoa o label `'auth'` de volta (senão o browser encerra a conexão) e recusa com close `4401` se inválido. Nunca via query param nem cookie
- Rooms identificadas por `${idVeiculo}:${idA}:${idB}` (ids ordenados para consistência)
- Ao receber mensagem: persiste na tabela `Mensagem` via TypeORM (mesma entity, mesmo banco) e faz broadcast para todos os sockets da room. **`idRemetente` sempre vem do token autenticado do socket, nunca do payload do cliente**
- Notificação de novas mensagens: evento WS `{ type: 'notification' }` enviado ao destinatário se ele estiver conectado fora da room (sem contagem de não lidas — a entity `Mensagem` não possui campo de leitura)
- **Heartbeat:** o chat-server faz ping a cada 30s e encerra sockets que não respondem com pong (conexões idle são derrubadas pelo proxy do Render e pelo Neon)
- **Reconexão:** o cliente (`useChat`) detecta `onclose` e reconecta com backoff, buscando um novo ws-token a cada tentativa (o token expira em 60s); cobre o cold-start do Render free tier (~30-50s)
- **DataSource único:** o chat-server inicializa o `DataSource` uma vez no startup (antes do `listen`) e reusa o repositório — nunca conecta por mensagem
- Healthcheck: `GET /health` retorna `200`

---

## React Query – Decisão de Uso

**Sim, React Query é recomendado.** Justificativas:

- Cache automático para listagem e detalhes de veículos (evita refetch desnecessário)
- `invalidateQueries(['veiculos'])` após cadastro/compra mantém a UI sincronizada
- `useInfiniteQuery` para paginação da listagem
- Histórico de mensagens carregado via React Query; mensagens em tempo real chegam pelo WS e são inseridas no cache via `queryClient.setQueryData`
- `useMutation` para upload de imagens e solicitação de compra com feedback de loading/error automático

---

## API Endpoints (resumo para Swagger)

### Auth
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/register` | Cadastro de usuário |
| POST | `/api/auth/login` | Login, retorna cookie JWT |
| POST | `/api/auth/logout` | Limpa cookie |
| GET | `/api/auth/ws-token` | Token efêmero (60s) para handshake WS (auth) |

### Veículos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/veiculos` | Listagem com filtros e paginação (ver detalhes abaixo) |
| POST | `/api/veiculos` | Cadastrar veículo (auth) |
| GET | `/api/veiculos/:id` | Detalhes |
| DELETE | `/api/veiculos/:id` | Soft-delete (auth, dono) |
| GET | `/api/veiculos/:id/imagens` | Listar imagens |
| POST | `/api/veiculos/:id/imagens` | Upload de imagem (auth, dono) |
| POST | `/api/veiculos/:id/compra` | Solicitar/confirmar compra (auth) |
| GET | `/api/veiculos/:id/mensagens` | Histórico do chat deste veículo |

#### Paginação e Filtros – `GET /api/veiculos`

**Query params aceitos:**

| Param | Tipo | Descrição |
|-------|------|-----------|
| `page` | integer | Página atual (default: `1`) |
| `limit` | integer | Itens por página (default: `12`, max: `48`) |
| `marca` | string | Filtro exato por marca |
| `modelo` | string | Filtro parcial (ILIKE) por modelo |
| `cor` | string | Filtro exato por cor |
| `anoMin` | integer | Ano mínimo (inclusive) |
| `anoMax` | integer | Ano máximo (inclusive) |
| `valorMin` | number | Valor mínimo (inclusive) |
| `valorMax` | number | Valor máximo (inclusive) |
| `quilometragemMax` | integer | Quilometragem máxima (inclusive) |

**Implementação no back-end (TypeORM):**

```typescript
const [data, total] = await veiculoRepo.findAndCount({
  where: {
    vendidoEm: IsNull(),
    deletadoEm: IsNull(),
    // filtros dinâmicos aplicados via QueryBuilder
  },
  order: { criadoEm: 'DESC' },
  skip: (page - 1) * limit,
  take: limit,
});
```

Usar `createQueryBuilder` quando houver filtros de range (`BETWEEN`) ou ILIKE. Nunca retornar todos os registros sem `take`.

**Response envelope obrigatório:**

```json
{
  "data": [ /* array de veículos */ ],
  "meta": {
    "total": 142,
    "page": 1,
    "limit": 12,
    "totalPages": 12
  }
}
```

**Front-end:** `useInfiniteQuery` do React Query consumindo `page` incrementalmente, com botão "Carregar mais" ou scroll infinito.

### Usuários
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/usuarios/:id` | Perfil público |

---

## Variáveis de Ambiente

### Banco (Neon) – regras de conexão
- Neon **exige SSL**: ambos os DataSources (app e chat-server) usam `ssl: { rejectUnauthorized: false }` ou `?sslmode=require` na connection string. Sem isso a conexão falha em produção.
- **App (Vercel):** usar a connection string **pooled** do Neon (host com `-pooler`) — serverless abre muitas conexões curtas.
- **Chat-server (Render):** usar a connection string **direct** (sem pooler) — uma conexão long-lived.
- **Schema:** o app é dono do schema. `synchronize` só `true` em desenvolvimento; rodar uma vez contra o Neon para criar as tabelas e então desligar. O **chat-server sempre usa `synchronize: false`** — ele nunca altera o schema.

### App Next.js (`.env.local`)
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/automarket
JWT_SECRET=sua_chave_secreta_aqui
JWT_EXPIRES_IN=7d
NEXT_PUBLIC_WS_URL=ws://localhost:8080
NODE_ENV=development
```

### Chat Server (`chat-server/.env`)
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/automarket
JWT_SECRET=sua_chave_secreta_aqui   # OBRIGATORIAMENTE o mesmo do app
PORT=8080
```

### Produção
- Vercel: `DATABASE_URL` (pooled + sslmode=require), `JWT_SECRET`, `JWT_EXPIRES_IN`, `NEXT_PUBLIC_WS_URL=wss://<chat-server>.onrender.com`, `NODE_ENV=production`
- Render: `DATABASE_URL` (direct + sslmode=require), `JWT_SECRET` (idêntico ao da Vercel), `PORT` é injetado pelo Render — ler `process.env.PORT`, nunca hardcodar
- `NEXT_PUBLIC_WS_URL` deve ser `wss://` (não `ws://`): uma página HTTPS não abre socket `ws://` (mixed content)

---

## Regras de Negócio Críticas

1. **Compra única:** ao confirmar compra, setar `idComprador` e `vendidoEm`; após isso o veículo sai de qualquer listagem.
2. **Imagem obrigatória:** no cadastro do veículo (`POST /api/veiculos`) exigir ao menos 1 imagem no mesmo request (multipart) ou como segunda etapa obrigatória antes de publicar.
3. **Soft-delete:** `deletadoEm` filtra veículos, usuários e imagens em todas as queries.
4. **Mensagens:** a relação `remetente → Usuario` já existe na entity; usar eager load apenas no histórico.
