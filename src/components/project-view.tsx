'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Download,
  ExternalLink,
  Loader2,
  Route as RouteIcon,
  Sparkles
} from 'lucide-react';
import { IdeaCard } from '@/components/idea-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { exportZip } from '@/lib/api-client';
import { formatRelative } from '@/lib/format';
import type { IdeaBrief, RepoBlueprint } from '@/lib/schemas';

export interface ProjectView {
  id: string;
  name: string;
  niche: string;
  createdAt: string;
  ideas: IdeaBrief[];
  blueprint: RepoBlueprint | null;
  blueprintCreatedAt: string | null;
  runs: {
    id: string;
    agentName: string;
    status: string;
    error: string | null;
    createdAt: string;
  }[];
}

const METHOD_VARIANT: Record<string, 'success' | 'secondary' | 'destructive' | 'outline'> = {
  GET: 'success',
  POST: 'secondary',
  PUT: 'outline',
  PATCH: 'outline',
  DELETE: 'destructive'
};

function CodeBlock({ value, label }: { value: string; label?: string }) {
  return (
    <div className="overflow-hidden rounded-md border">
      {label && (
        <div className="border-b bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
          {label}
        </div>
      )}
      <pre className="max-h-[420px] overflow-auto p-4 text-xs leading-relaxed">
        <code>{value}</code>
      </pre>
    </div>
  );
}

function TaskList({ blueprint }: { blueprint: RepoBlueprint }) {
  const [done, setDone] = useState<Set<number>>(
    () => new Set(blueprint.tasks.map((t, i) => (t.done ? i : -1)).filter((i) => i >= 0))
  );
  const phases = [...new Set(blueprint.tasks.map((t) => t.phase))];

  function toggle(index: number) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {phases.map((phase) => (
        <div key={phase}>
          <h3 className="mb-2 font-semibold">{phase}</h3>
          <ul className="space-y-1">
            {blueprint.tasks.map((task, index) => {
              if (task.phase !== phase) return null;
              const isDone = done.has(index);
              return (
                <li key={`${task.phase}-${index}`}>
                  <button
                    onClick={() => toggle(index)}
                    className="flex w-full items-start gap-2 rounded-md p-2 text-left text-sm transition-colors hover:bg-accent/50"
                  >
                    {isDone ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className={isDone ? 'text-muted-foreground line-through' : ''}>
                      {task.task}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function ProjectView({ project }: { project: ProjectView }) {
  const [exporting, setExporting] = useState(false);
  const blueprint = project.blueprint;
  const completed = blueprint ? blueprint.tasks.filter((t) => t.done).length : 0;

  async function download() {
    setExporting(true);
    try {
      const { blob, filename } = await exportZip(project.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${filename}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-background/85 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-5">
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
              <p className="text-sm text-muted-foreground">
                {project.niche} · created {formatRelative(project.createdAt)}
              </p>
            </div>
            <Button
              onClick={download}
              disabled={!blueprint || exporting}
              variant={blueprint ? 'default' : 'outline'}
            >
              {exporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Packing…
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export ZIP
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Tabs defaultValue="ideas">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="ideas">Ideas ({project.ideas.length})</TabsTrigger>
            <TabsTrigger value="readme">README</TabsTrigger>
            <TabsTrigger value="architecture">Architecture</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="prompts">Prompts</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Ideas found
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{project.ideas.length}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Blueprint
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">
                  {blueprint ? 'Ready' : 'Not yet'}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Tasks</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">
                  {blueprint ? `${completed}/${blueprint.tasks.length}` : '—'}
                </CardContent>
              </Card>
            </div>

            {blueprint && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    {blueprint.projectName}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{blueprint.tagline}</p>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <p>{blueprint.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {blueprint.techStack.map((tech) => (
                      <Badge key={tech} variant="secondary">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Agent runs</CardTitle>
              </CardHeader>
              <CardContent>
                {project.runs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No agent runs recorded yet.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {project.runs.map((run) => (
                      <li key={run.id} className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={
                            run.status === 'success'
                              ? 'success'
                              : run.status === 'error'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {run.agentName}
                        </Badge>
                        <span className="text-muted-foreground">{run.status}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">
                          {formatRelative(run.createdAt)}
                        </span>
                        {run.error && <span className="text-destructive">{run.error}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ideas">
            {project.ideas.length === 0 ? (
              <Alert>
                <AlertTitle>No ideas stored</AlertTitle>
                <AlertDescription>
                  This project has no ideas. Run the scout again to populate it.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {project.ideas.map((idea) => (
                  <IdeaCard key={idea.id} idea={idea} hasBlueprint={Boolean(blueprint)} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="readme">
            {blueprint ? (
              <CodeBlock value={blueprint.readmeMarkdown} label="README.md" />
            ) : (
              <Alert>
                <AlertTitle>No blueprint yet</AlertTitle>
                <AlertDescription>
                  Pick an idea on the Ideas tab and click &quot;Build blueprint&quot;.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="architecture" className="space-y-4">
            {blueprint ? (
              <>
                <CodeBlock value={blueprint.folderTree} label="Folder structure" />
                <CodeBlock value={blueprint.databaseSchema} label="schema.prisma" />

                <div>
                  <h3 className="mb-2 flex items-center gap-2 font-semibold">
                    <RouteIcon className="h-4 w-4" />
                    API routes
                  </h3>
                  <ul className="space-y-1 text-sm">
                    {blueprint.apiRoutes.map((route) => (
                      <li
                        key={`${route.method} ${route.path}`}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <Badge variant={METHOD_VARIANT[route.method] ?? 'outline'}>
                          {route.method}
                        </Badge>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{route.path}</code>
                        <span className="text-muted-foreground">{route.purpose}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold">UI pages</h3>
                  <ul className="space-y-2 text-sm">
                    {blueprint.uiPages.map((page) => (
                      <li key={page.path} className="rounded-md border p-3">
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                            {page.path}
                          </code>
                        </div>
                        <p className="mt-1 text-muted-foreground">{page.purpose}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Components: {page.components.join(', ') || '—'}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <Alert>
                <AlertTitle>No blueprint yet</AlertTitle>
                <AlertDescription>
                  Generate one from the Ideas tab to see the architecture.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="tasks">
            {blueprint ? (
              <TaskList blueprint={blueprint} />
            ) : (
              <Alert>
                <AlertTitle>No blueprint yet</AlertTitle>
                <AlertDescription>
                  Generate one from the Ideas tab to see the task list.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="prompts" className="space-y-4">
            {blueprint ? (
              blueprint.prompts.map((prompt, index) => (
                <CodeBlock key={index} value={prompt} label={`Prompt ${index + 1}`} />
              ))
            ) : (
              <Alert>
                <AlertTitle>No blueprint yet</AlertTitle>
                <AlertDescription>
                  Generate one from the Ideas tab to see the prompts.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            {blueprint ? (
              <>
                <Alert>
                  <AlertTitle>Export includes</AlertTitle>
                  <AlertDescription>
                    README.md, TASKS.md, ARCHITECTURE.md, prompts.md, schema.prisma, .env.example,
                    blueprint.json and every starter file the architect generated.
                  </AlertDescription>
                </Alert>
                <Button onClick={download} disabled={exporting}>
                  {exporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Packing…
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download {blueprint.projectName}.zip
                    </>
                  )}
                </Button>
                {blueprint.starterFiles.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold">Starter files</h3>
                    {blueprint.starterFiles.map((file) => (
                      <CodeBlock key={file.path} value={file.content} label={file.path} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Alert>
                <AlertTitle>Nothing to export yet</AlertTitle>
                <AlertDescription>
                  Generate a blueprint first — then you can download the whole starter repo as a
                  ZIP.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>

        {project.ideas.length > 0 && (
          <p className="mt-10 text-center text-xs text-muted-foreground">
            Ideas sourced from live trend signals. Explore them on{' '}
            <a
              href="https://github.com/trending"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-primary hover:underline"
            >
              GitHub Trending <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </p>
        )}
      </main>
    </div>
  );
}
