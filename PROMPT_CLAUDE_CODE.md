# Prompt – Claude Code: AutoMarket

Você vai construir do zero o projeto **AutoMarket**, uma plataforma de compra e venda de veículos usados com chat em tempo real. Siga rigorosamente tudo que está especificado abaixo. Não tome decisões arquiteturais que contrariem este documento.

---

## Stack obrigatória

### Back-end
- **Next.js 14+ App Router** – toda a API dentro de `app/api/` usando Route Handlers
- **TypeORM** com **PostgreSQL**
- **JWT** – autenticação stateless via cookie `HttpOnly; Secure; SameSite=Strict; Path=/`
- **bcrypt** – hash de senhas
- **ws** – servidor WebSocket nativo anexado ao HTTP server do Next.js via `instrumentation.ts`
- **next-swagger-doc** + **swagger-ui-react** – documentação em `/api/docs`

### Front-end
- **ShadcnUI + TailwindCSS** – todos os componentes visuais
- **Axios** – instância única criada com `axios.create({ baseURL: '/api' })` em `lib/axios.ts`
- **TanStack Query (React Query v5)** – toda busca de dados server-side; `useInfiniteQuery` para listagem de veículos; `useMutation` para uploads, compra e envio de mensagens
- **WebSocket nativo do browser** – apenas para o chat em tempo real

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

---

## Estrutura de pastas obrigatória

```
/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   ├── register/route.ts
│   │   │   └── logout/route.ts
│   │   ├── veiculos/
│   │   │   ├── route.ts                  (GET listagem paginada + filtros, POST cadastro)
│   │   │   └── [id]/
│   │   │       ├── route.ts              (GET detalhes, DELETE soft-delete)
│   │   │       ├── imagens/route.ts      (GET galeria, POST upload)
│   │   │       ├── compra/route.ts       (POST solicitar/confirmar compra)
│   │   │       └── mensagens/route.ts    (GET histórico do chat)
│   │   ├── usuarios/
│   │   │   └── [id]/route.ts             (GET perfil público)
│   │   ├── mensagens/route.ts            (POST persistir mensagem — chamado internamente pelo WS)
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
│   ├── auth.ts                           (signJwt, verifyJwt, setCookie, clearCookie)
│   ├── axios.ts                          (instância Axios)
│   └── ws-server.ts                      (lógica do servidor WebSocket)
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
├── instrumentation.ts                    (anexa ws-server ao HTTP server do Next.js)
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
4. `middleware.ts` — lê `request.cookies.get('token')`, verifica com `verifyJwt`; redireciona para `/login` se inválido nas rotas `(private)` e `/api/` que exigem auth

Helper `auth.ts` deve exportar:
```typescript
export function requireAuth(request: NextRequest): { id: string; nome: string } // lança 401 se inválido
```

---

## WebSocket – implementação detalhada

### `instrumentation.ts`
```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { attachWebSocketServer } = await import('./lib/ws-server')
    const { createServer } = await import('http')
    // anexar ao server interno do Next.js
    attachWebSocketServer()
  }
}
```

### `lib/ws-server.ts`
- Usar a lib `ws` (`npm install ws @types/ws`)
- Autenticar cada conexão: ler JWT do query param `?token=` no handshake — rejeitar com código 401 se inválido
- **Rooms:** chave = `${idVeiculo}:${[idA,idB].sort().join(':')}` — garante mesma room independente da ordem
- **Ao receber mensagem do cliente:**
  1. Validar payload `{ idDestinatario, idVeiculo, mensagem }`
  2. Persistir na tabela `Mensagem` via TypeORM
  3. Fazer broadcast para todos os sockets da room com:
     ```json
     { "type": "message", "data": { /* objeto Mensagem completo com remetente */ } }
     ```
  4. Enviar ao destinatário (se conectado em qualquer room) evento de notificação:
     ```json
     { "type": "notification", "count": <total de msgs não lidas> }
     ```

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
// 2. useEffect para abrir WebSocket com token JWT no query param
// 3. onmessage: se type === 'message', chamar queryClient.setQueryData para inserir no cache
// 4. Fechar WS no cleanup do useEffect
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

## Variáveis de ambiente (criar `.env.local`)

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/automarket
JWT_SECRET=sua_chave_secreta_aqui
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

---

## Swagger

Documentar **todos** os endpoints com JSDoc no padrão `next-swagger-doc`. Incluir:
- Schemas de request/response
- Códigos de erro possíveis (400, 401, 403, 404, 409)
- Indicação de quais rotas exigem autenticação

---

## Ordem de implementação sugerida

1. Configurar projeto Next.js + instalar dependências + configurar TailwindCSS + ShadcnUI
2. `lib/db.ts` — DataSource TypeORM conectando ao PostgreSQL
3. `lib/auth.ts` — JWT helpers
4. Endpoints de auth (`register`, `login`, `logout`) + `middleware.ts`
5. Endpoints de veículos (CRUD + paginação + filtros)
6. Endpoint de imagens (upload + listagem)
7. Endpoint de compra (com transaction)
8. `instrumentation.ts` + `lib/ws-server.ts` — WebSocket
9. Endpoint de mensagens (histórico)
10. Front-end: layout base + ShadcnUI + Axios + QueryClient provider
11. Páginas públicas: home (listagem + filtros) + detalhes do veículo
12. Páginas de auth: login + register
13. Páginas privadas: meus anúncios + novo anúncio + mensagens
14. Hooks: `useVeiculos`, `useVeiculo`, `useChat`
15. Componentes: `VeiculoCard`, `VeiculoFiltros`, `Galeria`, `ChatPanel`
16. Swagger — documentar todos os endpoints
17. Testes manuais de todos os fluxos

---

## O que NÃO fazer

- Não usar `fetch` diretamente no front-end — sempre usar a instância Axios de `lib/axios.ts`
- Não usar `localStorage` para armazenar o JWT — o cookie HttpOnly é a única fonte de autenticação
- Não retornar o campo `senha` do `Usuario` em nenhum endpoint
- Não retornar o campo `conteudo` (bytea) na listagem de veículos — apenas no endpoint de imagens
- Não fazer `find()` sem `take` na listagem de veículos
- Não criar a entity `Avaliacao` — está fora do escopo
- Não usar `socket.io` — usar a lib `ws` nativa
