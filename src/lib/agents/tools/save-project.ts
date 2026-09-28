import { prisma } from '@/lib/prisma';
import type { IdeaBrief, RepoBlueprint } from '@/lib/schemas';

export async function saveProject(input: { name: string; niche: string }) {
  return prisma.project.create({ data: { name: input.name, niche: input.niche } });
}

export async function saveIdeaBrief(projectId: string, idea: IdeaBrief) {
  return prisma.ideaBrief.create({
    data: { projectId, dataJson: JSON.stringify(idea) }
  });
}

export async function saveBlueprint(input: {
  projectId: string;
  ideaBriefId: string;
  blueprint: RepoBlueprint;
}) {
  return prisma.repoBlueprint.create({
    data: {
      projectId: input.projectId,
      ideaBriefId: input.ideaBriefId,
      dataJson: JSON.stringify(input.blueprint)
    }
  });
}

export async function logAgentRun(input: {
  projectId: string;
  agentName: string;
  input: unknown;
  output?: unknown;
  status: 'pending' | 'success' | 'error';
  error?: string;
  runId?: string;
}) {
  if (input.runId) {
    return prisma.agentRun.update({
      where: { id: input.runId },
      data: {
        status: input.status,
        outputJson: input.output === undefined ? undefined : JSON.stringify(input.output),
        error: input.error ?? null
      }
    });
  }

  return prisma.agentRun.create({
    data: {
      projectId: input.projectId,
      agentName: input.agentName,
      inputJson: JSON.stringify(input.input),
      outputJson: input.output === undefined ? undefined : JSON.stringify(input.output),
      status: input.status,
      error: input.error
    }
  });
}
