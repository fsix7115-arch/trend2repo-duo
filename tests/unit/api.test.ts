import { beforeAll, describe, expect, it } from 'vitest';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

// This suite drives the real Prisma client, so it needs a real database.
// Point DATABASE_URL at a throwaway SQLite file and push the schema, so the
// suite is self-contained in CI and never touches a developer's dev.db.
// This must run before the `@/lib/prisma` import below, which is why the
// dynamic import is used instead of a static one.
const ROOT = path.resolve(__dirname, '../..');
const TEST_DB = path.resolve(ROOT, '.test-data/api-test.db');
process.env.DATABASE_URL = `file:${TEST_DB}`;

mkdirSync(path.dirname(TEST_DB), { recursive: true });
execFileSync('npx', ['prisma', 'db', 'push', '--skip-generate', '--accept-data-loss'], {
  cwd: ROOT,
  env: { ...process.env },
  stdio: 'ignore'
});

const { prisma } = await import('@/lib/prisma');
import { buildExportZip } from '@/lib/agents/tools/export-zip';
import { RepoBlueprintSchema, type IdeaBrief, type RepoBlueprint } from '@/lib/schemas';

const IDEA: IdeaBrief = {
  id: 'idea-1',
  title: 'Rate limit dashboard',
  targetUser: 'Backend teams shipping public APIs',
  painPoint: 'Nobody knows which endpoint is close to its rate limit until users complain.',
  whyNow: 'More teams shipping public APIs without visibility layers.',
  existingAlternatives: ['Log dashboards', 'CloudWatch alarms'],
  mvpFeatures: ['Ingest usage events', 'Per-endpoint limit view'],
  techStack: ['Next.js 14', 'Prisma'],
  difficulty: 'medium',
  starPotential: 60,
  monetization: 'Portfolio play',
  sources: []
};

const BLUEPRINT: RepoBlueprint = {
  projectName: 'rate-limit-dashboard',
  tagline: 'See which endpoint is about to break',
  description: 'A small dashboard that surfaces rate-limit headroom per endpoint.',
  readmeMarkdown: [
    '# rate-limit-dashboard',
    '',
    'See which endpoint is about to break.',
    '',
    '## Setup',
    '',
    '```bash',
    'npm install',
    '```',
    ''
  ].join('\n'),
  techStack: ['Next.js 14', 'Prisma'],
  folderTree: ['rate-limit-dashboard/', '├─ src/', '└─ prisma/'].join('\n'),
  databaseSchema: [
    'datasource db {',
    '  provider = "sqlite"',
    '  url      = env("DATABASE_URL")',
    '}'
  ].join('\n'),
  apiRoutes: [{ method: 'GET', path: '/api/usage', purpose: 'List usage' }],
  uiPages: [{ path: '/', purpose: 'Dashboard', components: ['UsageTable'] }],
  tasks: [
    { phase: 'Phase 1', task: 'Scaffold', done: false },
    { phase: 'Phase 1', task: 'Schema', done: false }
  ],
  prompts: ['Build a usage table', 'Design the schema', 'Write the README'],
  starterFiles: [{ path: '.env.example', content: 'DATABASE_URL="file:./dev.db"\n' }],
  envExample: 'DATABASE_URL="file:./dev.db"\n'
};

describe('project + export flow', () => {
  let projectId: string;

  beforeAll(async () => {
    const project = await prisma.project.create({
      data: { name: 'api test project', niche: 'api tooling' }
    });
    projectId = project.id;

    const idea = await prisma.ideaBrief.create({
      data: { projectId, dataJson: JSON.stringify(IDEA) }
    });
    await prisma.repoBlueprint.create({
      data: { projectId, ideaBriefId: idea.id, dataJson: JSON.stringify(BLUEPRINT) }
    });
  });

  it('lists projects and fetches one with its blueprint', async () => {
    const list = await prisma.project.findMany({
      include: { _count: { select: { ideaBriefs: true } } }
    });
    expect(list.some((p) => p.id === projectId)).toBe(true);

    const detail = await prisma.project.findUnique({
      where: { id: projectId },
      include: { ideaBriefs: { include: { blueprints: true } } }
    });
    expect(detail).not.toBeNull();
    expect(detail?.ideaBriefs[0].blueprints).toHaveLength(1);
    expect(
      RepoBlueprintSchema.safeParse(JSON.parse(detail!.ideaBriefs[0].blueprints[0].dataJson))
        .success
    ).toBe(true);
  });

  it('builds a ZIP containing every export document', async () => {
    const blob = await buildExportZip({
      projectName: 'rate-limit-dashboard',
      idea: IDEA,
      blueprint: BLUEPRINT
    });
    expect(blob.size).toBeGreaterThan(0);

    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const names = Object.keys(zip.files);

    for (const expected of [
      'README.md',
      'TASKS.md',
      'ARCHITECTURE.md',
      'prompts.md',
      'schema.prisma',
      '.env.example',
      'blueprint.json',
      '.env.example'
    ]) {
      expect(names).toContain(expected);
    }
  });

  it('records agent runs with a terminal status', async () => {
    const run = await prisma.agentRun.create({
      data: {
        projectId,
        agentName: 'trend-scout',
        inputJson: JSON.stringify({ niche: 'api tooling' }),
        outputJson: JSON.stringify({ count: 5 }),
        status: 'success'
      }
    });
    const saved = await prisma.agentRun.findUnique({ where: { id: run.id } });
    expect(saved?.status).toBe('success');
  });
});
