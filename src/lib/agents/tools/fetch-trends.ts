import { z } from 'zod';
import type { SourceName } from '@/lib/schemas';

export interface TrendSignal {
  source: SourceName;
  title: string;
  url: string;
  points: number;
  summary: string;
  keywords: string[];
}

const TIMEOUT_MS = 12_000;

async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'User-Agent': 'trend2repo-duo/0.1 (+https://github.com/fsix7115-arch/trend2repo-duo)',
        ...(init?.headers ?? {})
      }
    });
  } finally {
    clearTimeout(timer);
  }
}

const HACKER_NEWS_ID_URL = 'https://hacker-news.firebaseio.com/v0/topstories.json';
const HN_ITEM_URL = 'https://hacker-news.firebaseio.com/v0/item/{id}.json';

const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'for',
  'with',
  'about',
  'from',
  'into',
  'your',
  'you',
  'how',
  'why',
  'what',
  'when',
  'who',
  'that',
  'this',
  'these',
  'those',
  'show',
  'ask',
  'hn',
  'tell',
  'new',
  'now',
  'was',
  'are',
  'its',
  'it',
  'has',
  'have',
  'not',
  'more',
  'than',
  'can',
  'will',
  'just',
  'like',
  'get',
  'use',
  'using',
  'make',
  'made',
  'build',
  'building',
  'let',
  'our',
  'we',
  'us',
  'all',
  'some',
  'any',
  'there',
  'here'
]);

function extractKeywords(text: string, limit = 8): string[] {
  const counts = new Map<string, number>();
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9+#.-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  for (const word of words) {
    if (word.length < 3 || STOPWORDS.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, limit)
    .map(([word]) => word);
}

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchHackerNewsTop(limit = 30): Promise<TrendSignal[]> {
  const ids = (await (await safeFetch(HACKER_NEWS_ID_URL)).json()) as number[];
  const top = ids.slice(0, Math.min(limit, 60));

  const items: (TrendSignal | null)[] = await Promise.all(
    top.map(async (id): Promise<TrendSignal | null> => {
      try {
        const item = (await (await safeFetch(HN_ITEM_URL.replace('{id}', String(id)))).json()) as {
          title?: string;
          url?: string;
          score?: number;
          descendants?: number;
        } | null;
        if (!item?.title) return null;
        return {
          source: 'hackernews' as const,
          title: item.title,
          url: item.url ?? `https://news.ycombinator.com/item?id=${id}`,
          points: item.score ?? 0,
          summary: `${item.score ?? 0} points, ${item.descendants ?? 0} comments`,
          keywords: extractKeywords(item.title)
        } satisfies TrendSignal;
      } catch {
        return null;
      }
    })
  );

  return items.filter((i): i is TrendSignal => i !== null);
}

const GITHUB_TRENDING_SINCE: Record<string, string> = {
  daily: 'daily',
  weekly: 'weekly',
  monthly: 'monthly'
};

export async function fetchGitHubTrending(
  language?: string,
  since: 'daily' | 'weekly' | 'monthly' = 'daily'
): Promise<TrendSignal[]> {
  const url = new URL('https://github.com/trending');
  if (language) url.pathname = `/trending/${encodeURIComponent(language)}`;
  const period = GITHUB_TRENDING_SINCE[since] ?? 'daily';

  const html = await (await safeFetch(url.toString(), { headers: { Accept: 'text/html' } })).text();

  const signals: TrendSignal[] = [];
  const articleRe = /<article[^>]*class="[^"]*Box-row[^"]*"[\s\S]*?<\/article>/g;
  const articles = html.match(articleRe) ?? [];

  for (const article of articles) {
    const repoMatch = article.match(/<h2[^>]*>[\s\S]*?href="\/([^"]+)"/);
    if (!repoMatch?.[1]) continue;
    const repo = repoMatch[1].replace(/\s+/g, '');

    const descMatch = article.match(/<p[^>]*class="[^"]*col-9[^"]*"[\s\S]*?<\/p>/);
    const description = descMatch ? stripHtml(descMatch[0]) : '';
    const langMatch = article.match(/itemprop="programmingLanguage"[^>]*>([^<]+)</);
    const languageName = langMatch?.[1]?.trim();
    const starsMatch = article.match(/href="\/[^"]+\/stargazers"[^>]*>[\s\S]{0,200}?([\d,]+)</);

    signals.push({
      source: 'github',
      title: `${repo} — ${description || 'trending repository'}`.slice(0, 200),
      url: `https://github.com/${repo}`,
      points: Number((starsMatch?.[1] ?? '0').replace(/,/g, '')) || 0,
      summary: `${repo}${languageName ? ` (${languageName})` : ''}${
        starsMatch?.[1] ? `, ${starsMatch[1]} stars today` : ''
      }`,
      keywords: extractKeywords(`${repo} ${description}`)
    });
  }

  void period;
  return signals;
}

const REDDIT_BASES = [
  'https://www.reddit.com/r/{sub}/hot.json?limit={limit}',
  'https://old.reddit.com/r/{sub}/hot.json?limit={limit}'
];

export async function fetchRedditTop(subreddit: string, limit = 25): Promise<TrendSignal[]> {
  const target = subreddit.replace(/^r\//i, '').trim();
  if (!target) return [];

  for (const base of REDDIT_BASES) {
    for (const sort of ['', '?sort=top&t=week']) {
      const url =
        base.replace('{sub}', encodeURIComponent(target)).replace('{limit}', String(limit)) + sort;
      try {
        const response = await safeFetch(url, { headers: { Accept: 'application/json' } });
        if (!response.ok) continue;
        const payload = (await response.json()) as {
          data?: { children?: { data?: Record<string, unknown> }[] };
        };
        const children = payload.data?.children ?? [];
        const signals = children
          .map(({ data }) => data)
          .filter((d): d is Record<string, unknown> => Boolean(d?.title))
          .map((d) => ({
            source: 'reddit' as const,
            title: String(d.title),
            url: String(d.url ?? `https://www.reddit.com${d.permalink ?? ''}`),
            points: Number(d.score ?? 0) || 0,
            summary: String(d.selftext ?? d.title ?? '').slice(0, 300),
            keywords: extractKeywords(`${d.title ?? ''} ${d.selftext ?? ''}`)
          }));
        if (signals.length) return signals;
      } catch {
        continue;
      }
    }
  }
  return [];
}

const SearchResultSchema = z.object({
  url: z.string(),
  title: z.string().optional(),
  content: z.string().optional()
});

/** Normalize Tavily/Serper result shapes into TrendSignals, dropping bad rows. */
function toWebSignals(rows: unknown[] | undefined): TrendSignal[] {
  return (rows ?? []).flatMap<TrendSignal>((row) => {
    const parsed = SearchResultSchema.safeParse(row);
    if (!parsed.success) return [];
    const { title, content, url } = parsed.data;
    return [
      {
        source: 'web',
        title: title ?? url,
        url,
        points: 0,
        summary: (content ?? '').slice(0, 300),
        keywords: extractKeywords(`${title ?? ''} ${content ?? ''}`)
      }
    ];
  });
}

export async function webSearch(query: string): Promise<TrendSignal[]> {
  const tavily = process.env.TAVILY_API_KEY?.trim();
  if (tavily) {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: tavily, query, max_results: 8 })
    });
    if (response.ok) {
      const payload = (await response.json()) as { results?: unknown[] };
      return toWebSignals(payload.results);
    }
  }

  const serper = process.env.SERPER_API_KEY?.trim();
  if (serper) {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serper, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: 8 })
    });
    if (response.ok) {
      const payload = (await response.json()) as { organic?: unknown[] };
      return toWebSignals(payload.organic);
    }
  }

  return [];
}

export async function collectSignals(options: {
  sources: SourceName[];
  niche: string;
  keywords: string[];
  redditSubs?: string[];
}): Promise<TrendSignal[]> {
  const { sources, niche, keywords, redditSubs = [] } = options;
  const tasks: Promise<TrendSignal[]>[] = [];

  if (sources.includes('github')) {
    tasks.push(fetchGitHubTrending(undefined, 'daily').catch(() => []));
  }
  if (sources.includes('hackernews')) {
    tasks.push(fetchHackerNewsTop(30).catch(() => []));
  }
  for (const sub of redditSubs) {
    tasks.push(fetchRedditTop(sub, 25).catch(() => []));
  }
  if (sources.includes('web')) {
    const query = [niche, ...keywords].filter(Boolean).join(' ');
    tasks.push(webSearch(query).catch(() => []));
  }

  const results = await Promise.all(tasks);
  return results.flat().slice(0, 120);
}
