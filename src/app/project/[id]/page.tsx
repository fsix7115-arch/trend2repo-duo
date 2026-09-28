import { notFound } from 'next/navigation';
import { ProjectView, type ProjectView as ProjectViewType } from '@/components/project-view';
import { prisma } from '@/lib/prisma';
import { IdeaBriefSchema, RepoBlueprintSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      ideaBriefs: {
        orderBy: { createdAt: 'desc' },
        include: { blueprints: { orderBy: { createdAt: 'desc' } } }
      },
      agentRuns: { orderBy: { createdAt: 'desc' }, take: 20 }
    }
  });

  if (!project) notFound();

  const ideas = project.ideaBriefs
    .map((record) => IdeaBriefSchema.safeParse(JSON.parse(record.dataJson)))
    .filter((r) => r.success)
    .map((r) => r.data);

  const latestBlueprintRecord = project.ideaBriefs
    .flatMap((i) => i.blueprints)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

  const parsedBlueprint = latestBlueprintRecord
    ? RepoBlueprintSchema.safeParse(JSON.parse(latestBlueprintRecord.dataJson))
    : null;

  const view: ProjectViewType = {
    id: project.id,
    name: project.name,
    niche: project.niche,
    createdAt: project.createdAt.toISOString(),
    ideas,
    blueprint: parsedBlueprint?.success ? parsedBlueprint.data : null,
    blueprintCreatedAt: latestBlueprintRecord?.createdAt.toISOString() ?? null,
    runs: project.agentRuns.map((run) => ({
      id: run.id,
      agentName: run.agentName,
      status: run.status,
      error: run.error,
      createdAt: run.createdAt.toISOString()
    }))
  };

  return <ProjectView project={view} />;
}
