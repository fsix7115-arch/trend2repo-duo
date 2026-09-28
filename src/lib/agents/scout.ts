import { generateObject } from 'ai';
import { z } from 'zod';
import {
  DifficultySchema,
  IdeaBriefSchema,
  type IdeaBrief,
  type ScoutRequest
} from '@/lib/schemas';
import { getOpenAIModel, resolveProvider } from '@/lib/ai-provider';
import { collectSignals, type TrendSignal } from './tools/fetch-trends';

const SCOUT_IDEAS_SCHEMA = z.object({
  ideas: z.array(IdeaBriefSchema.omit({ id: true }).extend({ id: z.string().optional() }))
});

const SYSTEM_PROMPT = `You are the Trend Scout Agent for Trend2Repo Duo.

You mine real trend signals (GitHub Trending, Hacker News, Reddit, web search) and
turn them into exactly 5 buildable side-project ideas for a solo developer.

Rules:
- Return exactly 5 ideas, no more, no fewer.
- Each idea must be traceable to the provided signals; cite source URLs in \`sources\`.
- Be specific about the pain point and the target user, not generic SaaS filler.
- \`mvpFeatures\`: 3-6 concrete features shippable in a weekend.
- \`difficulty\`: honest estimate. \`starPotential\`: 0-100, calibrated, not inflated.
- \`monetization\`: realistic path or an explicit "no monetization; portfolio play".
- Prefer ideas that are NOT clones of an existing trending repo.`;

function withIds(ideas: (Omit<IdeaBrief, 'id'> & { id?: string })[]): IdeaBrief[] {
  return ideas.map((idea, index) => ({
    ...idea,
    id: idea.id?.trim() || `idea-${index + 1}`
  }));
}

function rankSignals(signals: TrendSignal[], keywords: string[], limit = 40): TrendSignal[] {
  const terms = keywords.map((k) => k.toLowerCase().trim()).filter(Boolean);
  const scored = signals.map((signal) => {
    const haystack = `${signal.title} ${signal.summary} ${signal.keywords.join(' ')}`.toLowerCase();
    const matches = terms.filter((t) => haystack.includes(t)).length;
    const relevance = matches * 1000 + signal.points;
    return { signal, relevance };
  });
  return scored
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit)
    .map((s) => s.signal);
}

function heuristicIdeas(request: ScoutRequest, signals: TrendSignal[]): IdeaBrief[] {
  const top = rankSignals(signals, request.keywords, 5);
  const themes = top.length
    ? top
    : [
        {
          source: 'web' as const,
          title: `${request.niche} tooling gap`,
          url: 'https://example.com/no-live-signals',
          points: 0,
          summary: 'No live trend source responded; ideas derived from the niche alone.',
          keywords: request.keywords.slice(0, 5)
        }
      ];

  return themes.map((signal, index) => {
    const theme = signal.keywords[0] ?? request.niche.toLowerCase().replace(/\s+/g, '-');
    const difficulty = (['easy', 'medium', 'hard'] as const)[Math.min(index, 2)];
    return {
      id: `idea-${index + 1}`,
      title: `${capitalize(theme)} for ${request.niche}`,
      targetUser: `Solo developers and small teams working in ${request.niche}`,
      painPoint: `Teams working in ${request.niche} still piece together this workflow by hand. Signal: ${signal.summary}`,
      whyNow: `Currently trending: ${signal.title}. Interest is fresh, so a focused tool lands before the gap fills.`,
      existingAlternatives: [
        'Manual spreadsheets and copy-paste',
        'Generic all-in-one suites that are too heavy'
      ],
      mvpFeatures: [
        `Import ${theme} data from a single source and normalize it`,
        'Searchable board with saved filters',
        'Shareable read-only link for collaborators',
        'CSV export'
      ],
      techStack: ['Next.js 14', 'TypeScript', 'Tailwind CSS', 'Prisma', 'SQLite'],
      difficulty,
      starPotential: Math.max(35, 85 - index * 12),
      monetization: 'Freemium with a $9/mo pro tier once usage grows; free while in MVP',
      sources: [signal.url]
    };
  });
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export interface ScoutResult {
  ideas: IdeaBrief[];
  mode: 'live' | 'fallback';
  provider: string;
  signalsUsed: number;
}

export async function runTrendScout(request: ScoutRequest): Promise<ScoutResult> {
  const signals = await collectSignals({
    sources: request.sources,
    niche: request.niche,
    keywords: request.keywords
  });

  const provider = resolveProvider();

  if (provider.name !== 'openai') {
    return {
      ideas: heuristicIdeas(request, signals),
      mode: 'fallback',
      provider: provider.name === 'none' ? 'heuristic-fallback' : 'anthropic-unwired',
      signalsUsed: signals.length
    };
  }

  const ranked = rankSignals(signals, request.keywords, 40);
  const signalDigest = ranked
    .map(
      (s, i) =>
        `${i + 1}. [${s.source}] ${s.title} | ${s.summary} | keywords: ${s.keywords.join(', ')} | ${s.url}`
    )
    .join('\n');

  const { object } = await generateObject({
    model: getOpenAIModel(),
    schema: SCOUT_IDEAS_SCHEMA,
    system: SYSTEM_PROMPT,
    temperature: 0.7,
    prompt: `Niche: ${request.niche}
User keywords: ${request.keywords.join(', ') || '(none)'}
Sources enabled: ${request.sources.join(', ')}

Trend signals collected right now (${signals.length} total, top ${ranked.length} shown):
${signalDigest || '(no live signals returned — rely on your own knowledge of the space and be explicit about it)'}

Produce exactly 5 distinct, buildable ideas. Each must reference at least one signal URL in \`sources\` when signals are available.`,
    maxTokens: 4000
  });

  const ideas = withIds(object.ideas as Omit<IdeaBrief, 'id'>[]).slice(0, 5);
  while (ideas.length < 5 && ideas.length > 0) {
    ideas.push({ ...ideas[ideas.length - 1], id: `idea-${ideas.length + 1}` });
  }

  return {
    ideas,
    mode: 'live',
    provider: `${provider.name}/${provider.model}`,
    signalsUsed: signals.length
  };
}

export { DifficultySchema };
