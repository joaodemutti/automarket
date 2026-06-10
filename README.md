# AutoMarket

Platform for buying and selling used vehicles with real-time chat.

## Stack

| Layer | Tech |
|---|---|
| Frontend + API | Next.js 16 (App Router) |
| Database | PostgreSQL via TypeORM |
| Auth | JWT stored in HTTP-only cookies |
| Real-time chat | WebSocket server (`chat-server/`) |
| Styling | Tailwind CSS v4 |

## Project structure

```
.                   → Next.js app (frontend + REST API routes)
chat-server/        → Standalone WebSocket server
src/entity/         → TypeORM entities shared by API routes
src/migration/      → Database migrations
```

## Local development

### 1. Prerequisites

- Node.js 20+
- PostgreSQL running locally

### 2. Environment — Next.js app

Create `.env.local` at the repo root:

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/automarket
JWT_SECRET=change_me
JWT_EXPIRES_IN=7d
NEXT_PUBLIC_WS_URL=ws://localhost:8080
NODE_ENV=development
```

### 3. Environment — chat server

Create `chat-server/.env`:

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/automarket
JWT_SECRET=change_me
PORT=8080
```

> `JWT_SECRET` must be the same value in both files.

### 4. Run migrations

```bash
npm run migration:run
```

### 5. Start

```bash
# Terminal 1 — Next.js
npm run dev

# Terminal 2 — WebSocket server
cd chat-server
npm run dev
```

---

## Deployment

Deploy in this order: **Neon → Render → Vercel**.

### Neon (database)

1. Sign up at [neon.tech](https://neon.tech) and create a project.
2. Copy the connection string — looks like:
   ```
   postgresql://neondb_owner:xxx@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. Point your local `.env.local` at it and run migrations:
   ```bash
   npm run migration:run
   ```

### Render (WebSocket server)

1. Sign up at [render.com](https://render.com) and create a **Web Service** from this repo.
2. Configure:

   | Setting | Value |
   |---|---|
   | Root Directory | `chat-server` |
   | Runtime | Node |
   | Build Command | `npm install && npm run build` |
   | Start Command | `npm start` |

3. Add environment variables:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Neon connection string |
   | `JWT_SECRET` | A strong random secret |
   | `NODE_ENV` | `production` |

4. After deploy, note the service URL (e.g. `https://automarket-chat.onrender.com`).
   Your WebSocket URL is: `wss://automarket-chat.onrender.com`

> **Free tier caveat**: Render free instances spin down after 15 min of inactivity, which drops open WebSocket connections. Use a paid plan for production.

### Vercel (Next.js app)

1. Sign up at [vercel.com](https://vercel.com) and import this repo.
2. Framework is auto-detected as Next.js. Leave Root Directory as `.`.
3. Add environment variables:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Neon connection string |
   | `JWT_SECRET` | Same secret as Render |
   | `JWT_EXPIRES_IN` | `7d` |
   | `NEXT_PUBLIC_WS_URL` | `wss://automarket-chat.onrender.com` |

4. Deploy.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build for production |
| `npm run migration:run` | Apply pending migrations |
| `npm run migration:generate` | Generate a new migration from entity changes |
| `npm run migration:revert` | Revert the last migration |
