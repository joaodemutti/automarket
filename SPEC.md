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
- **WebSocket (ws)** – servidor nativo para o chat em tempo real
- **Swagger (swagger-jsdoc + swagger-ui-express ou next-swagger-doc)** – documentação da API

### Front-end
- **Next.js** – SSR / RSC onde aplicável
- **ShadcnUI + TailwindCSS** – componentes e estilização
- **Axios** – instância criada com `axios.create({ baseURL: '/api' })`
- **TanStack Query (React Query)** – cache, loading/error states, invalidação após mutations
- **WebSocket nativo do browser** – consumo do chat em tempo real

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
| RF08 | Notificação de novas mensagens (badge/counter em tempo real via WS) |
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

## Arquitetura de Pastas (Next.js App Router)

```
/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   ├── register/route.ts
│   │   │   └── logout/route.ts
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
│   │   ├── mensagens/route.ts            (POST enviar via REST; WS é paralelo)
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
│   ├── axios.ts                          (instância Axios com baseURL='/api')
│   └── ws-server.ts                      (inicialização do servidor WebSocket)
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
└── middleware.ts                         (proteção de rotas via JWT cookie)
```

---

## Autenticação

- **Fluxo:** `POST /api/auth/login` → verifica login/senha → assina JWT → seta cookie `HttpOnly; Secure; SameSite=Strict; Path=/`
- **Middleware Next.js** lê o cookie, verifica o token e redireciona se inválido
- **Logout:** `POST /api/auth/logout` → limpa o cookie
- Senha armazenada com **bcrypt**

---

## WebSocket – Chat

- Servidor `ws` inicializado em `lib/ws-server.ts` e anexado ao servidor HTTP do Next.js no `instrumentation.ts`
- Cada conexão WS é autenticada via token JWT no handshake (query param ou header)
- Rooms identificadas por `${idVeiculo}:${idA}:${idB}` (ids ordenados para consistência)
- Ao receber mensagem: persiste na tabela `Mensagem` e faz broadcast para todos os sockets da room
- Notificação de novas mensagens: evento WS separado `{ type: 'notification', count: N }` enviado ao destinatário em qualquer room ativa

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

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/automarket
JWT_SECRET=sua_chave_secreta_aqui
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

---

## Regras de Negócio Críticas

1. **Compra única:** ao confirmar compra, setar `idComprador` e `vendidoEm`; após isso o veículo sai de qualquer listagem.
2. **Imagem obrigatória:** no cadastro do veículo (`POST /api/veiculos`) exigir ao menos 1 imagem no mesmo request (multipart) ou como segunda etapa obrigatória antes de publicar.
3. **Soft-delete:** `deletadoEm` filtra veículos, usuários e imagens em todas as queries.
4. **Mensagens:** a relação `remetente → Usuario` já existe na entity; usar eager load apenas no histórico.
