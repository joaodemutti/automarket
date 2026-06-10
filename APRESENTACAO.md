# AutoMarket — Plataforma de Compra e Venda de Veículos

---

## 1. Introdução

O AutoMarket é uma plataforma web para anúncio e negociação de veículos usados. O objetivo é conectar compradores e vendedores com comunicação em tempo real, eliminando intermediários.

**Escopo MVP:**
- Cadastro e autenticação de usuários
- Publicação e busca de anúncios de veículos
- Chat em tempo real entre comprador e vendedor
- Confirmação de venda pelo vendedor

---

## 2. Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend + API | Next.js 16 (App Router) |
| Banco de dados | PostgreSQL (Neon) |
| ORM | TypeORM |
| Autenticação | JWT em cookie HTTP-only |
| Tempo real | WebSocket (`ws`) |
| Estilização | Tailwind CSS v4 |
| Deploy frontend | Vercel |
| Deploy chat server | Render |

---

## 3. Arquitetura

O sistema é dividido em dois serviços independentes que compartilham o mesmo banco de dados:

```
┌─────────────┐     REST API      ┌──────────────┐
│   Browser   │ ◄───────────────► │  Next.js     │
│             │                   │  (Vercel)    │
│             │     WebSocket     ├──────────────┤
│             │ ◄───────────────► │  Chat Server │
└─────────────┘                   │  (Render)    │
                                  └──────┬───────┘
                                         │
                                  ┌──────▼───────┐
                                  │  PostgreSQL  │
                                  │   (Neon)     │
                                  └──────────────┘
```

- **Next.js** — serve o frontend e expõe rotas REST para autenticação, veículos e mensagens
- **Chat Server** — servidor WebSocket dedicado para mensagens em tempo real
- **PostgreSQL** — banco único compartilhado entre os dois serviços

---

## 4. Funcionalidades

**Autenticação**
- Registro e login com senha criptografada (bcrypt)
- JWT armazenado em cookie HTTP-only; middleware protege rotas privadas

**Anúncios**
- CRUD de veículos com imagens, especificações e descrição
- Listagem com filtros (marca, modelo, cor, ano, valor, km)
- Contador de interessados por anúncio

**Chat em tempo real**
- Conexão WebSocket autenticada via token
- Histórico persistido no banco; notificações de nova mensagem
- Vendedor vê todos os compradores interessados em um anúncio

**Venda**
- Vendedor confirma venda selecionando o comprador
- Anúncio marcado como vendido com badge visual

---

## 5. Conclusão e Possíveis Melhorias

O MVP atinge o objetivo de conectar compradores e vendedores com comunicação em tempo real sobre um stack moderno e totalmente serverless.

**Melhorias futuras:**
- Upload de imagens para armazenamento externo (S3/Cloudinary)
- Avaliações entre compradores e vendedores
- Notificações push (PWA)
- Paginação e ordenação avançada nos anúncios
- Painel administrativo
