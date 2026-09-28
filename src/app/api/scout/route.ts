import { runTrendScout } from '@/lib/agents/scout';
import { saveIdeaBrief, saveProject, logAgentRun } from '@/lib/agents/tools/save-project';
import { fail, handleRouteError, ok } from '@/lib/api-response';
import { clientKeyFromRequest, rateLimit } from '@/lib/rate-limit';
import { IdeaBriefArraySchema, ScoutRequestSchema } from '@/lib/schemas';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const limit = rateLimit(clientKeyFromRequest(request, 'scout'), 8, 60_000);
    if (!limit.ok) {
      return fail('Rate limit exceeded. Try again in a minute.', 429, {
        retryAfterMs: limit.resetAt - Date.now()
      });
    }

    const body = ScoutRequestSchema.parse(await request.json());

    const project = await saveProject({
      name: `${body.niche} — scout run`,
      niche: body.niche
    });

    const run = await logAgentRun({
      projectId: project.id,
      agentName: 'trend-scout',
      input: body,
      status: 'pending'
    });

    try {
      const result = await runTrendScout(body);
      const validated = IdeaBriefArraySchema.parse(result.ideas);

      const saved = [];
      for (const idea of validated) {
        saved.push(await saveIdeaBrief(project.id, idea));
      }

      await logAgentRun({
        projectId: project.id,
        agentName: 'trend-scout',
        input: body,
        output: { count: saved.length, mode: result.mode },
        status: 'success',
        runId: run.id
      });

      return ok({
        projectId: project.id,
        ideas: validated,
        mode: result.mode,
        provider: result.provider
      });
    } catch (error) {
      await logAgentRun({
        projectId: project.id,
        agentName: 'trend-scout',
        input: body,
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
