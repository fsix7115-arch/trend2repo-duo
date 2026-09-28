'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ExternalLink, Loader2, Sparkles, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { runArchitect } from '@/lib/api-client';
import type { IdeaBrief } from '@/lib/schemas';

const DIFFICULTY_VARIANT = {
  easy: 'success',
  medium: 'secondary',
  hard: 'destructive'
} as const;

export function IdeaCard({ idea, hasBlueprint }: { idea: IdeaBrief; hasBlueprint: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function build() {
    setBusy(true);
    try {
      const result = await runArchitect(idea);
      toast.success(
        result.mode === 'live' ? 'Blueprint generated' : 'Blueprint generated (fallback mode)'
      );
      // push() to the same URL is a no-op, so refresh to re-render the
      // server component with the new blueprint.
      router.push(`/project/${result.projectId}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Architect failed');
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base leading-snug">{idea.title}</CardTitle>
          <Badge variant={DIFFICULTY_VARIANT[idea.difficulty]}>{idea.difficulty}</Badge>
        </div>
        <div className="flex items-center gap-1 pt-1 text-sm text-muted-foreground">
          <Star className="h-3.5 w-3.5 fill-current" />
          <span>{idea.starPotential}/100 star potential</span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 text-sm">
        <p className="text-muted-foreground">{idea.painPoint}</p>

        {expanded && (
          <div className="space-y-3 rounded-md bg-muted/50 p-3 text-sm">
            <div>
              <p className="font-medium">Target user</p>
              <p className="text-muted-foreground">{idea.targetUser}</p>
            </div>
            <div>
              <p className="font-medium">Why now</p>
              <p className="text-muted-foreground">{idea.whyNow}</p>
            </div>
            <div>
              <p className="font-medium">MVP features</p>
              <ul className="list-inside list-disc space-y-0.5 text-muted-foreground">
                {idea.mvpFeatures.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium">Stack</p>
              <p className="text-muted-foreground">{idea.techStack.join(' · ')}</p>
            </div>
            <div>
              <p className="font-medium">Monetization</p>
              <p className="text-muted-foreground">{idea.monetization}</p>
            </div>
            {idea.sources.length > 0 && (
              <div>
                <p className="font-medium">Sources</p>
                <ul className="space-y-0.5">
                  {idea.sources.map((s) => (
                    <li key={s}>
                      <a
                        href={s}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        {s} <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="mt-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Less' : 'Details'}
          </Button>
          <Button size="sm" className="flex-1" onClick={build} disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Designing…
              </>
            ) : hasBlueprint ? (
              'Regenerate blueprint'
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Build blueprint
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
