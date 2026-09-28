import { describe, expect, it } from 'vitest';
import { runRepoArchitect } from '@/lib/agents/architect';
import { RepoBlueprintSchema, type IdeaBrief } from '@/lib/schemas';

const SAMPLE_IDEA: IdeaBrief = {
  id: 'idea-1',
  title: 'Changelog digest for indie apps',
  targetUser: 'Solo maintainers shipping weekly',
  painPoint: 'Writing a changelog by hand every release takes an hour and gets skipped.',
  whyNow:
    'More solo devs shipping weekly than ever, and release notes are now the main discovery surface.',
  existingAlternatives: ['Manual notes in a text file', 'Generic release-note generators'],
  mvpFeatures: ['Connect a GitHub repo', 'Generate notes from merged PRs', 'Markdown export'],
  techStack: ['Next.js 14', 'TypeScript', 'Prisma', 'SQLite'],
  difficulty: 'easy',
  starPotential: 72,
  monetization: 'Free tier, $5/mo for private repos',
  sources: ['https://news.ycombinator.com/']
};

describe('Repo Architect Agent', () => {
  it('returns one schema-valid RepoBlueprint', async () => {
    const result = await runRepoArchitect(SAMPLE_IDEA);

    expect(result.blueprint).toBeTruthy();
    expect(() => RepoBlueprintSchema.parse(result.blueprint)).not.toThrow();

    const blueprint = result.blueprint;
    expect(blueprint.projectName).toMatch(/^[a-z0-9-]+$/);
    expect(blueprint.readmeMarkdown.length).toBeGreaterThanOrEqual(50);
    expect(blueprint.readmeMarkdown).toContain(blueprint.projectName);
    expect(blueprint.folderTree).toContain('src/');
    expect(blueprint.databaseSchema).toContain('datasource db');
    expect(blueprint.apiRoutes.length).toBeGreaterThanOrEqual(1);
    expect(blueprint.uiPages.length).toBeGreaterThanOrEqual(1);
    expect(blueprint.tasks.length).toBeGreaterThanOrEqual(8);
    expect(blueprint.tasks.every((t) => t.done === false)).toBe(true);
    expect(blueprint.prompts.length).toBeGreaterThanOrEqual(3);
    expect(blueprint.envExample).toContain('DATABASE_URL');
  }, 60_000);
});
