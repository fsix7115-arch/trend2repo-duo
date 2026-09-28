import { runRepoArchitect } from '@/lib/agents/architect';
import { logAgentRun, saveBlueprint } from '@/lib/agents/tools/save-project';
import { fail, handleRouteError, ok } from '@/lib/api-response';
import { clientKeyFromRequest, rateLimit } from '@/lib/rate-limit';
import { ArchitectRequestSchema } from '@/lib/schemas';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const maxDuration = 90;

export async function POST(request: Request) {
  try {
    const limit = rateLimit(clientKeyFromRequest(request, 'architect'), 8, 60_000);
    if (!limit.ok) {
      return fail('Rate limit exceeded. Try again in a minute.', 429, {
        retryAfterMs: limit.resetAt - Date.now()
      });
    }

    const { ideaBrief } = ArchitectRequestSchema.parse(await request.json());

    // Prefer the newest saved brief for this idea; fall back to a standalone
    // project so a blueprint can be generated without a prior scout run.
    const saved = await prisma.ideaBrief.findFirst({
      where: { dataJson: { contains: ideaBrief.id } },
      orderBy: { createdAt: 'desc' }
    });

    const projectId = saved?.projectId;
    const ideaBriefId = saved?.id;

    if (!projectId || !ideaBriefId) {
      return fail(
        'Unknown ideaBrief — run the scout first or pass an idea id that was saved.',
        404
      );
    }

    const run = await logAgentRun({
      projectId,
      agentName: 'repo-architect',
      input: { ideaBriefId },
      status: 'pending'
    });

    try {
      const result = await runRepoArchitect(ideaBrief);
      const record = await saveBlueprint({
        projectId,
        ideaBriefId,
        blueprint: result.blueprint
      });

      await logAgentRun({
        projectId,
        agentName: 'repo-architect',
        input: { ideaBriefId },
        output: { blueprintId: record.id, mode: result.mode },
        status: 'success',
        runId: run.id
      });

      return ok({
        projectId,
        blueprintId: record.id,
        blueprint: result.blueprint,
        mode: result.mode,
        provider: result.provider
      });
    } catch (error) {
      await logAgentRun({
        projectId,
        agentName: 'repo-architect',
        input: { ideaBriefId },
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        runId: run.id
      });
      throw error;
    }
  } catch (error) {
    return handleRouteError(error);
  }
}
