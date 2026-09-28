import { generateObject } from 'ai';
import { z } from 'zod';
import {
  IdeaBriefSchema,
  RepoBlueprintSchema,
  type IdeaBrief,
  type RepoBlueprint
} from '@/lib/schemas';
import { getOpenAIModel, resolveProvider } from '@/lib/ai-provider';
import { slugify } from '@/lib/utils';

const SYSTEM_PROMPT = `You are the Repo Architect Agent for Trend2Repo Duo.

You take ONE validated IdeaBrief and emit a complete, buildable GitHub repo
blueprint that a solo developer could execute this weekend.

Rules:
- \`readmeMarkdown\` must be a real README: one-line pitch, problem, install, usage, roadmap, license. No placeholders like "TODO".
- \`folderTree\`: a concrete, correct directory tree. No "..." for important parts.
- \`databaseSchema\`: valid Prisma schema using \`datasource db { provider = "sqlite" }\` and \`generator client { provider = "prisma-client-js" }\`.
- \`apiRoutes\`: REST routes with HTTP method, path and a one-line purpose. 4-10 routes.
- \`uiPages\`: App Router pages with purpose and component list. 2-5 pages.
- \`tasks\`: ordered, concrete implementation tasks grouped by phase. 8-20 tasks, all \`done: false\`.
- \`prompts\`: 3+ reusable AI prompts that help build or extend the project.
- \`starterFiles\`: 1-4 real code files (package.json snippets, route handler, component) with compilable content.
- \`envExample\`: dotenv block listing every env var the generated project needs.`;

function fallbackBlueprint(idea: IdeaBrief): RepoBlueprint {
  const projectName = slugify(idea.title) || 'generated-project';

  return {
    projectName,
    tagline: idea.title,
    description: idea.painPoint,
    readmeMarkdown: [
      `# ${idea.title}`,
      '',
      `> ${idea.painPoint}`,
      '',
      '## Why now',
      '',
      idea.whyNow,
      '',
      '## Target user',
      '',
      idea.targetUser,
      '',
      '## MVP features',
      '',
      ...idea.mvpFeatures.map((f) => `- [ ] ${f}`),
      '',
      '## Stack',
      '',
      ...idea.techStack.map((t) => `- ${t}`),
      '',
      '## Getting started',
      '',
      '```bash',
      'git clone https://github.com/your-handle/' + projectName + '.git',
      'cd ' + projectName,
      'npm install',
      'cp .env.example .env.local   # fill in values',
      'npm run dev',
      '```',
      '',
      'Open http://localhost:3000',
      '',
      '## Alternatives today',
      '',
      ...idea.existingAlternatives.map((a) => `- ${a}`),
      '',
      '## Roadmap',
      '',
      '1. Ship the MVP features above',
      '2. Add auth and multi-user projects',
      '3. Public sharing and integrations',
      '',
      '## License',
      '',
      'MIT',
      ''
    ].join('\n'),
    techStack: idea.techStack,
    folderTree: [
      projectName + '/',
      '├─ src/',
      '│  ├─ app/',
      '│  │  ├─ page.tsx            # home / primary workflow',
      '│  │  ├─ api/',
      '│  │  │  └─ items/route.ts    # CRUD API',
      '│  │  └─ layout.tsx',
      '│  ├─ components/            # shared UI',
      '│  └─ lib/                   # db client, validation',
      '├─ prisma/',
      '│  └─ schema.prisma',
      '├─ .env.example',
      '├─ package.json',
      '├─ README.md',
      '└─ tsconfig.json'
    ].join('\n'),
    databaseSchema: [
      'generator client {',
      '  provider = "prisma-client-js"',
      '}',
      '',
      'datasource db {',
      '  provider = "sqlite"',
      '  url      = env("DATABASE_URL")',
      '}',
      '',
      'model Item {',
      '  id        String   @id @default(cuid())',
      '  title     String',
      '  body      String?',
      '  createdAt DateTime @default(now())',
      '  updatedAt DateTime @updatedAt',
      '',
      '  @@index([createdAt])',
      '}'
    ].join('\n'),
    apiRoutes: [
      { method: 'GET', path: '/api/items', purpose: 'List all items, newest first' },
      { method: 'POST', path: '/api/items', purpose: 'Create an item' },
      { method: 'GET', path: '/api/items/[id]', purpose: 'Fetch a single item' },
      { method: 'DELETE', path: '/api/items/[id]', purpose: 'Delete an item' }
    ],
    uiPages: [
      {
        path: '/',
        purpose: 'Primary workflow: create and browse items',
        components: ['ItemForm', 'ItemList', 'EmptyState']
      },
      {
        path: '/items/[id]',
        purpose: 'Item detail and edit',
        components: ['ItemDetail', 'ItemForm']
      }
    ],
    tasks: [
      {
        phase: 'Phase 1 — Scaffold',
        task: `Init Next.js 14 + TypeScript in ${projectName}`,
        done: false
      },
      {
        phase: 'Phase 1 — Scaffold',
        task: 'Add Tailwind CSS and set up the design tokens',
        done: false
      },
      {
        phase: 'Phase 2 — Data',
        task: 'Define Prisma models and run the initial migration',
        done: false
      },
      { phase: 'Phase 2 — Data', task: 'Seed 10 realistic sample items', done: false },
      {
        phase: 'Phase 3 — API',
        task: `Implement GET/POST /api/items with Zod validation`,
        done: false
      },
      { phase: 'Phase 3 — API', task: 'Implement GET/DELETE /api/items/[id]', done: false },
      {
        phase: 'Phase 4 — UI',
        task: 'Build ItemForm with react-hook-form + zodResolver',
        done: false
      },
      {
        phase: 'Phase 4 — UI',
        task: 'Build ItemList with loading, empty and error states',
        done: false
      },
      {
        phase: 'Phase 5 — Polish',
        task: `Write the README and license for ${projectName}`,
        done: false
      },
      { phase: 'Phase 5 — Polish', task: 'Run npm run build and fix all type errors', done: false }
    ],
    prompts: [
      `Write a Next.js 14 App Router page for ${idea.title} that lists items in a responsive card grid with skeleton loading and an empty state.`,
      `Given this Prisma schema, generate typed CRUD API route handlers with Zod validation and consistent error responses:\n${idea.title}`,
      `Review the MVP feature list for ${idea.title} and cut scope to what one developer can ship in 48 hours, explaining each cut.`
    ],
    starterFiles: [
      {
        path: '.env.example',
        content: `DATABASE_URL="file:./dev.db"
`
      },
      {
        path: `src/app/api/items/route.ts`,
        content: [
          "import { NextResponse } from 'next/server';",
          "import { z } from 'zod';",
          "import { prisma } from '@/lib/prisma';",
          '',
          'const ItemInput = z.object({',
          '  title: z.string().min(1),',
          '  body: z.string().optional()',
          '});',
          '',
          'export async function GET() {',
          "  const items = await prisma.item.findMany({ orderBy: { createdAt: 'desc' } });",
          '  return NextResponse.json({ data: items });',
          '}',
          '',
          'export async function POST(request: Request) {',
          '  const parsed = ItemInput.safeParse(await request.json());',
          '  if (!parsed.success) {',
          '    return NextResponse.json({ error: parsed.error.issues }, { status: 422 });',
          '  }',
          '  const item = await prisma.item.create({ data: parsed.data });',
          '  return NextResponse.json({ data: item }, { status: 201 });',
          '}'
        ].join('\n')
      }
    ],
    envExample: `DATABASE_URL="file:./dev.db"
`
  };
}

export interface ArchitectResult {
  blueprint: RepoBlueprint;
  mode: 'live' | 'fallback';
  provider: string;
}

export async function runRepoArchitect(idea: IdeaBrief): Promise<ArchitectResult> {
  const provider = resolveProvider();

  if (provider.name !== 'openai') {
    return {
      blueprint: fallbackBlueprint(idea),
      mode: 'fallback',
      provider: provider.name === 'none' ? 'heuristic-fallback' : 'anthropic-unwired'
    };
  }

  const { object } = await generateObject({
    model: getOpenAIModel(),
    schema: RepoBlueprintSchema,
    system: SYSTEM_PROMPT,
    temperature: 0.5,
    maxTokens: 8000,
    prompt: `Build the complete repo blueprint for this idea:\n\n${JSON.stringify(idea, null, 2)}`
  });

  return {
    blueprint: { ...object, projectName: slugify(object.projectName) || 'generated-project' },
    mode: 'live',
    provider: `${provider.name}/${provider.model}`
  };
}

export const BlueprintInputSchema = z.object({ idea: IdeaBriefSchema });
