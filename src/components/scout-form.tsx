'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Radar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { runScout } from '@/lib/api-client';
import { ScoutRequestSchema, type ScoutRequest, type SourceName } from '@/lib/schemas';

const SOURCE_OPTIONS: { id: SourceName; label: string; hint: string }[] = [
  { id: 'github', label: 'GitHub Trending', hint: 'Repos gaining stars right now' },
  { id: 'hackernews', label: 'Hacker News', hint: 'Top stories and launches' },
  { id: 'reddit', label: 'Reddit', hint: 'Community pain-point threads' },
  { id: 'web', label: 'Web search', hint: 'Needs TAVILY_API_KEY or SERPER_API_KEY' }
];

const SUGGESTED_KEYWORDS = [
  'ai agents',
  'developer tools',
  'self-hosted',
  'local first',
  'sqlite',
  'cli',
  'observability',
  'rag',
  'edge deploy',
  'privacy'
];

export function ScoutForm() {
  const router = useRouter();
  const [keywordDraft, setKeywordDraft] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<ScoutRequest>({
    resolver: zodResolver(ScoutRequestSchema),
    defaultValues: { niche: '', keywords: [], sources: ['github', 'hackernews'] }
  });

  const sources = watch('sources');
  const keywords = watch('keywords') ?? [];

  function addKeyword(value: string) {
    const clean = value.trim().toLowerCase();
    if (!clean) return;
    setValue('keywords', Array.from(new Set([...(watch('keywords') ?? []), clean])), {
      shouldValidate: true
    });
    setKeywordDraft('');
  }

  async function onSubmit(values: ScoutRequest) {
    try {
      const result = await runScout(values);
      toast.success(
        result.mode === 'live'
          ? `Scout found ${result.ideas.length} ideas`
          : `Scout ran in fallback mode — ${result.ideas.length} ideas`
      );
      router.push(`/project/${result.projectId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Scout failed');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Radar className="h-5 w-5 text-primary" />
          Run the Trend Scout
        </CardTitle>
        <CardDescription>
          Give it a niche. It reads live signals and returns exactly 5 buildable project ideas.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="niche">Niche</Label>
            <Input
              id="niche"
              placeholder="e.g. indie game dev tooling, or personal finance for freelancers"
              {...register('niche')}
            />
            {errors.niche && <p className="text-sm text-destructive">{errors.niche.message}</p>}
          </div>

          <div className="space-y-3">
            <Label htmlFor="keyword">Keywords (optional)</Label>
            <div className="flex gap-2">
              <Input
                id="keyword"
                value={keywordDraft}
                placeholder="Press Enter to add"
                onChange={(e) => setKeywordDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addKeyword(keywordDraft);
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={() => addKeyword(keywordDraft)}>
                Add
              </Button>
            </div>

            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {keywords.map((k) => (
                  <Badge key={k} variant="secondary" className="gap-1 pr-1">
                    {k}
                    <button
                      type="button"
                      aria-label={`Remove ${k}`}
                      className="rounded p-0.5 hover:bg-background"
                      onClick={() =>
                        setValue(
                          'keywords',
                          keywords.filter((x) => x !== k),
                          { shouldValidate: true }
                        )
                      }
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 pt-1">
              {SUGGESTED_KEYWORDS.filter((s) => !keywords.includes(s))
                .slice(0, 6)
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addKeyword(s)}
                    className="rounded-full border border-dashed px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                  >
                    + {s}
                  </button>
                ))}
            </div>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Sources</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {SOURCE_OPTIONS.map((option) => {
                const id = `source-${option.id}`;
                const checked = sources?.includes(option.id) ?? false;
                return (
                  <label
                    key={option.id}
                    htmlFor={id}
                    className="flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors hover:bg-accent/50"
                  >
                    <Checkbox
                      id={id}
                      className="mt-0.5"
                      checked={checked}
                      onCheckedChange={(value) => {
                        const current = watch('sources') ?? [];
                        const next = value
                          ? [...current, option.id]
                          : current.filter((s) => s !== option.id);
                        setValue('sources', next, { shouldValidate: true });
                      }}
                    />
                    <span className="text-sm">
                      <span className="block font-medium">{option.label}</span>
                      <span className="text-muted-foreground">{option.hint}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.sources && <p className="text-sm text-destructive">{errors.sources.message}</p>}
          </fieldset>

          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scouting trends… (20-40s)
              </>
            ) : (
              <>
                <Radar className="mr-2 h-4 w-4" />
                Run Scout
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
