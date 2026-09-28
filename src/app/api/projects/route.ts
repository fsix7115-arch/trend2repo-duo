import { prisma } from '@/lib/prisma';
import { handleRouteError, ok } from '@/lib/api-response';
import { CreateProjectSchema } from '@/lib/schemas';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { ideaBriefs: true, blueprints: true } }
      }
    });
    return ok(projects);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = CreateProjectSchema.parse(await request.json());
    const project = await prisma.project.create({
      data: { name: body.name ?? `${body.niche} project`, niche: body.niche }
    });
    return ok(project, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
