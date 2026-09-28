import { buildExportZip } from '@/lib/agents/tools/export-zip';
import { logAgentRun } from '@/lib/agents/tools/save-project';
import { fail, handleRouteError } from '@/lib/api-response';
import { ExportRequestSchema, IdeaBriefSchema, RepoBlueprintSchema } from '@/lib/schemas';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/utils';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { projectId } = ExportRequestSchema.parse(await request.json());

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        ideaBriefs: {
          orderBy: { createdAt: 'desc' },
          include: { blueprints: { orderBy: { createdAt: 'desc' }, take: 1 } }
        }
      }
    });

    if (!project) return fail('Project not found', 404);

    const withBlueprint = project.ideaBriefs.find((i) => i.blueprints.length > 0);
    if (!withBlueprint) return fail('Generate a blueprint before exporting', 409);

    const idea = IdeaBriefSchema.parse(JSON.parse(withBlueprint.dataJson));
    const blueprint = RepoBlueprintSchema.parse(JSON.parse(withBlueprint.blueprints[0].dataJson));

    const zip = await buildExportZip({ projectName: project.name, idea, blueprint });
    const filename = `${slugify(blueprint.projectName) || 'blueprint'}.zip`;

    await logAgentRun({
      projectId: project.id,
      agentName: 'export',
      input: { blueprintId: withBlueprint.blueprints[0].id },
      output: { filename },
      status: 'success'
    });

    return new Response(zip, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
