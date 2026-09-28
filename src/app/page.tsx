import Link from 'next/link';
import { ArrowRight, Compass, GitBranch, Radar, Sparkles } from 'lucide-react';
import { AppHeader } from '@/components/app-header';
import { ScoutForm } from '@/components/scout-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const AGENTS = [
  {
    icon: Radar,
    name: 'Trend Scout Agent',
    body: 'Pulls live signals from GitHub Trending, Hacker News, Reddit and optional web search, then returns exactly 5 buildable ideas with sources attached.'
  },
  {
    icon: GitBranch,
    name: 'Repo Architect Agent',
    body: 'Takes one idea and produces a full repo blueprint: README, folder tree, Prisma schema, API routes, UI pages, phased tasks, prompts and starter code.'
  }
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <section className="mb-12 max-w-3xl">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="mr-1 h-3 w-3" />
            Two agents, one pipeline
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Find the trend. Ship the repo.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Trend2Repo Duo turns what people are building right now into a GitHub repository you can
            actually finish this weekend — blueprint, tasks and starter code included.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <a href="#scout">
                Run the scout
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/dashboard">See saved projects</Link>
            </Button>
          </div>
        </section>

        <section className="mb-12 grid gap-4 md:grid-cols-2">
          {AGENTS.map(({ icon: Icon, name, body }) => (
            <Card key={name} className="p-6">
              <Icon className="mb-3 h-6 w-6 text-primary" />
              <h2 className="text-lg font-semibold">{name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </Card>
          ))}
        </section>

        <section id="scout" className="mx-auto max-w-2xl scroll-mt-20">
          <ScoutForm />
        </section>

        <footer className="mt-16 border-t pt-6 text-center text-sm text-muted-foreground">
          <Compass className="mr-1 inline h-4 w-4" />
          Built with Next.js 14, Prisma and the Vercel AI SDK. No API key? The agents run in
          heuristic fallback mode so you can still explore the flow.
        </footer>
      </main>
    </div>
  );
}
