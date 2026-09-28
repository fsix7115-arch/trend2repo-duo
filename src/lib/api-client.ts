import type { IdeaBrief, RepoBlueprint, ScoutRequest } from './schemas';

export interface ScoutResponse {
  projectId: string;
  ideas: IdeaBrief[];
  mode: 'live' | 'fallback';
  provider: string;
}

export interface ArchitectResponse {
  projectId: string;
  blueprintId: string;
  blueprint: RepoBlueprint;
  mode: 'live' | 'fallback';
  provider: string;
}

async function parseError<T>(response: Response): Promise<T> {
  let message = `Request failed (${response.status})`;
  let payload: { error?: string } | null = null;
  try {
    payload = (await response.json()) as { error?: string };
    if (payload?.error) message = payload.error;
  } catch {
    // non-JSON error body
  }
  throw new Error(message);
}

export async function runScout(body: ScoutRequest): Promise<ScoutResponse> {
  const response = await fetch('/api/scout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) return parseError(response);
  const payload = (await response.json()) as { data: ScoutResponse };
  return payload.data;
}

export async function runArchitect(ideaBrief: IdeaBrief): Promise<ArchitectResponse> {
  const response = await fetch('/api/architect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ideaBrief })
  });
  if (!response.ok) return parseError(response);
  const payload = (await response.json()) as { data: ArchitectResponse };
  return payload.data;
}

export async function exportZip(projectId: string): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch('/api/export/zip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId })
  });
  if (!response.ok) return parseError(response);

  const disposition = response.headers.get('Content-Disposition') ?? '';
  const match = disposition.match(/filename="?([^";]+)"?/);
  return {
    blob: await response.blob(),
    filename: match?.[1] ?? 'blueprint.zip'
  };
}
