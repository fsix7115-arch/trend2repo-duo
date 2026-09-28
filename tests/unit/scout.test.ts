import { describe, expect, it } from 'vitest';
import { runTrendScout } from '@/lib/agents/scout';
import { IdeaBriefArraySchema } from '@/lib/schemas';

describe('Trend Scout Agent', () => {
  it('returns exactly 5 schema-valid IdeaBrief objects', async () => {
    const result = await runTrendScout({
      niche: 'developer tools',
      keywords: ['cli'],
      sources: ['hackernews']
    });

    expect(result.ideas).toHaveLength(5);
    expect(result.ideas.map((i) => i.id)).toEqual([
      'idea-1',
      'idea-2',
      'idea-3',
      'idea-4',
      'idea-5'
    ]);

    // Throws if any idea violates the IdeaBrief contract.
    expect(() => IdeaBriefArraySchema.parse(result.ideas)).not.toThrow();

    for (const idea of result.ideas) {
      expect(idea.title.length).toBeGreaterThanOrEqual(3);
      expect(['easy', 'medium', 'hard']).toContain(idea.difficulty);
      expect(idea.starPotential).toBeGreaterThanOrEqual(0);
      expect(idea.starPotential).toBeLessThanOrEqual(100);
      expect(idea.mvpFeatures.length).toBeGreaterThanOrEqual(2);
    }
  }, 60_000);
});
