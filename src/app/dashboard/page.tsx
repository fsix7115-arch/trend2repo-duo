import Link from 'next/link';
import { FolderOpen, LayoutDashboard } from 'lucide-react';
import { AppHeader } from '@/components/app-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { prisma } from '@/lib/prisma';
import { formatRelative } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { ideaBriefs: true, blueprints: true } } }
  });

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex items-center gap-3">
          <LayoutDashboard className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        </div>

        {projects.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 p-12 text-center">
            <FolderOpen className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">No projects yet</p>
              <p className="text-sm text-muted-foreground">
                Run the scout to create your first project.
              </p>
            </div>
            <Button asChild>
              <Link href="/#scout">Run the scout</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link key={project.id} href={`/project/${project.id}`}>
                <Card className="h-full p-5 transition-colors hover:border-primary/50 hover:bg-accent/30">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h2 className="font-semibold leading-snug">{project.name}</h2>
                    {project._count.blueprints > 0 && (
                      <Badge variant="success">blueprint ready</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{project.niche}</p>
                  <div className="mt-4 flex gap-3 text-xs text-muted-foreground">
                    <span>{project._count.ideaBriefs} ideas</span>
                    <span>·</span>
                    <span>{project._count.blueprints} blueprints</span>
                    <span>·</span>
                    <span>{formatRelative(project.createdAt)}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
