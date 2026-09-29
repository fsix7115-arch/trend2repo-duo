<div align="center">

# Trend2Repo Duo

[![CI](https://github.com/fsix7115-arch/trend2repo-duo/actions/workflows/ci.yml/badge.svg)](https://github.com/fsix7115-arch/trend2repo-duo/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Tests](https://img.shields.io/badge/tests-5%20passing-brightgreen)](tests/unit)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Two AI agents. One pipeline. Find the trend, ship the repo.**

[![Next.js 14](https://img.shields.io/badge/Next.js-14.2-000?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma)](https://www.prisma.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

## Demo

<!-- Replace the placeholder below with a real recording before publishing. -->

> **Demo GIF placeholder** — record the flow below and drop the GIF at `docs/demo.gif`, then replace this block with:
>
> ```md
> ![Demo](docs/demo.gif)
> ```
>
> Flow to record: land on `/` → type a niche → **Run Scout** → land on the project page → expand an idea → **Build blueprint** → click through the README / Architecture / Tasks / Prompts tabs → **Export ZIP**.

| Screen                   | Screenshot           |
| ------------------------ | -------------------- |
| Landing + scout form     | `docs/landing.png`   |
| Project detail with tabs | `docs/project.png`   |
| Dashboard                | `docs/dashboard.png` |

## What it does

**Trend2Repo Duo** is a two-agent pipeline that turns "what's hot right now" into "here's a repo you can finish this weekend."

| Agent              | Input                                          | Output                                                                                                             |
| ------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Trend Scout**    | a niche + optional keywords + source selection | exactly 5 `IdeaBrief` objects, each citing the real signals it came from                                           |
| **Repo Architect** | one selected `IdeaBrief`                       | one `RepoBlueprint`: README, folder tree, Prisma schema, API routes, UI pages, phased tasks, prompts, starter code |

Every run is persisted, and any blueprint can be downloaded as a starter repository ZIP.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (App Router, RSC + client islands)                    │
│  /  ·  /dashboard  ·  /project/[id]                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ fetch / JSON + ZIP
┌──────────────────────────▼──────────────────────────────────────┐
│  API routes (Node runtime)                                      │
│  POST /api/scout      POST /api/architect                      │
│  POST /api/projects   GET  /api/projects, /api/projects/[id]   │
│  POST /api/export/zip                                           │
│  Zod validation · in-memory rate limit · uniform error shape    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  Agent layer                                                    │
│  fetchGitHubTrending · fetchHackerNewsTop · fetchRedditTop      │
│  webSearch (Tavily / Serper) · saveProjectToDb · exportZip      │
│                                                                 │
│  Provider resolution at RUNTIME:                               │
│    OPENAI_API_KEY   → live LLM agents                           │
│    none configured → deterministic heuristic fallback           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  Prisma → SQLite (file:./dev.db)                                │
│  Project · IdeaBrief · RepoBlueprint · AgentRun                 │
└─────────────────────────────────────────────────────────────────┘
```

## Tech stack

- **Next.js 14** App Router + TypeScript (strict)
- **Tailwind CSS** + shadcn/ui + lucide-react
- **Prisma** + SQLite for a zero-config local MVP
- **Vercel AI SDK** (`generateObject`) for structured agent output
- **Zod** for every request, response and agent payload
- **React Hook Form** + `zodResolver` for the scout form
- **JSZip** for the blueprint export
- **Vitest** (unit + API) and **Playwright** (e2e)
- **ESLint** + **Prettier**

## Getting started

```bash
git clone https://github.com/fsix7115-arch/trend2repo-duo.git
cd trend2repo-duo
npm install
cp .env.example .env
```

`npm install` runs `prisma generate` automatically.

```bash
# create the SQLite file
npx prisma db push

# optional: one demo project so the dashboard is not empty
npm run db:seed
```

Add an API key to `.env` for live agents (optional — see [No API key?](#no-api-key)):

```dotenv
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
TAVILY_API_KEY=tvly-...      # optional, enables the web-search source
SERPER_API_KEY=...           # optional, alternative to Tavily
```

Then:

```bash
npm run dev     # http://localhost:3000
```

## Scripts

| Command             | What it does                                      |
| ------------------- | ------------------------------------------------- |
| `npm run dev`       | Start the dev server                              |
| `npm run build`     | `prisma generate` + production build              |
| `npm run typecheck` | `tsc --noEmit`                                    |
| `npm run lint`      | ESLint via `next lint`                            |
| `npm run format`    | Prettier, write mode                              |
| `npm test`          | Vitest unit + API tests                           |
| `npm run test:e2e`  | Playwright happy path (starts its own dev server) |
| `npm run db:push`   | Sync the Prisma schema to SQLite                  |
| `npm run db:seed`   | Insert one demo project                           |
| `npm run db:studio` | Open Prisma Studio                                |

## API

| Method | Path                 | Body                               | Returns                                                 |
| ------ | -------------------- | ---------------------------------- | ------------------------------------------------------- |
| `POST` | `/api/scout`         | `{ niche, keywords[], sources[] }` | `{ projectId, ideas: IdeaBrief[5], mode, provider }`    |
| `POST` | `/api/architect`     | `{ ideaBrief }`                    | `{ projectId, blueprintId, blueprint, mode, provider }` |
| `POST` | `/api/projects`      | `{ name?, niche }`                 | `Project`                                               |
| `GET`  | `/api/projects`      | —                                  | `Project[]` with counts                                 |
| `GET`  | `/api/projects/[id]` | —                                  | project with ideas, blueprints, agent runs              |
| `POST` | `/api/export/zip`    | `{ projectId }`                    | `application/zip` attachment                            |

All responses are wrapped in `{ data }`; errors are `{ error, issues? }` with a
matching HTTP status (`400` / `404` / `409` / `422` / `429` / `500`).

## Core schemas

`IdeaBrief`

```ts
{
  id: string;
  title: string;
  targetUser: string;
  painPoint: string;
  whyNow: string;
  existingAlternatives: string[];
  mvpFeatures: string[];
  techStack: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  starPotential: number;   // 0-100
  monetization: string;
  sources: string[];
}
```

`RepoBlueprint`

```ts
{
  projectName: string;
  tagline: string;
  description: string;
  readmeMarkdown: string;
  techStack: string[];
  folderTree: string;
  databaseSchema: string;
  apiRoutes: { method: string; path: string; purpose: string }[];
  uiPages: { path: string; purpose: string; components: string[] }[];
  tasks: { phase: string; task: string; done: boolean }[];
  prompts: string[];
  starterFiles: { path: string; content: string }[];
  envExample: string;
}
```

The Scout is validated with `IdeaBriefArraySchema`, which is
`z.array(IdeaBriefSchema).length(5)` — **exactly five ideas, enforced by the schema,
not by a prompt.**

## No API key?

The app is fully usable without any AI provider configured. `resolveProvider()`
runs at request time (never at build time), so `next build` and `next dev` both
work with an empty `.env`.

When no key is present, both agents fall back to deterministic local synthesis:

- the **Scout** still fetches real GitHub Trending and Hacker News signals and
  derives five ideas from the top-ranked ones, so the UI flow is identical;
- the **Architect** emits a complete, valid blueprint — real README, real Prisma
  schema, real task list — from the idea alone.

Responses carry `mode: 'live' | 'fallback'` and `provider`, and the UI surfaces
which one ran. This makes the project demoable and CI-testable with zero
credentials.

## Assumptions made

1. **OpenAI is the wired provider.** `ANTHROPIC_API_KEY` is read and reported by
   `resolveProvider()`, but the Anthropic adapter is not wired into
   `generateObject`; the app falls back instead. Adding it is a ~10-line change in
   `src/lib/ai-provider.ts` once `@ai-sdk/anthropic` is installed.
2. **SQLite, single instance.** Rate limiting is an in-memory fixed window
   (`src/lib/rate-limit.ts`) — correct for local and single-container deploys.
   Swap for Redis/Upstash before running multi-region.
3. **No auth.** Anyone who can reach the app can create projects. This is an MVP;
   add auth before exposing it publicly.
4. **Rate limits are per-IP and per-route**: 8 requests/minute on `/api/scout`
   and `/api/architect`.
5. **The Architect requires a saved `IdeaBrief`.** It looks the brief up by
   `idea.id`; an unknown id returns `404` rather than silently creating a
   detached project.
6. **Idea order is meaningful.** Idea 1 is the strongest signal match, so it is
   the default recommendation.

## Testing

```bash
npm test          # 5 unit + API tests
npm run test:e2e  # Playwright: scout → ideas → blueprint → dashboard
```

- `tests/unit/scout.test.ts` — the Scout returns exactly 5 schema-valid ideas
- `tests/unit/architect.test.ts` — the Architect returns one schema-valid blueprint
- `tests/unit/api.test.ts` — persistence round-trip and ZIP contents
- `tests/e2e/happy-path.spec.ts` — the full happy path in a real browser

## Roadmap

- [ ] Wire the Anthropic provider behind the same `resolveProvider()` contract
- [ ] Streaming scout progress (SSE) so long runs show which source is being read
- [ ] Idea scoring across runs, so the dashboard can rank past projects
- [ ] GitHub OAuth so a blueprint can be scaffolded straight into a new repo
- [ ] Postgres + Redis for multi-instance deployment

## License

MIT — see [LICENSE](LICENSE).
