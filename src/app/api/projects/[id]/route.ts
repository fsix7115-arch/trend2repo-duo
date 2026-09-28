import { prisma } from '@/lib/prisma';
import { fail, handleRouteError, ok } from '@/lib/api-response';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
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

    if (!project) return fail('Project not found', 404);
    return ok(project);
  } catch (error) {
    return handleRouteError(error);
  }
}
