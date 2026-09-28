import JSZip from 'jszip';
import type { IdeaBrief, RepoBlueprint } from '@/lib/schemas';

export interface ExportPayload {
  projectName: string;
  idea: IdeaBrief;
  blueprint: RepoBlueprint;
}

function architectureMarkdown(payload: ExportPayload): string {
  const { blueprint } = payload;
  return [
    '# Architecture',
    '',
    blueprint.description,
    '',
    '## Tech stack',
    '',
    ...blueprint.techStack.map((t) => `- ${t}`),
    '',
    '## Folder structure',
    '',
    '```',
    blueprint.folderTree,
    '```',
    '',
    '## Database schema',
    '',
    '```prisma',
    blueprint.databaseSchema,
    '```',
    '',
    '## API routes',
    '',
    ...blueprint.apiRoutes.map((r) => `- \`${r.method} ${r.path}\` — ${r.purpose}`),
    '',
    '## UI pages',
    '',
    ...blueprint.uiPages.map((p) => `- \`${p.path}\` — ${p.purpose} (${p.components.join(', ')})`),
    ''
  ].join('\n');
}

function tasksMarkdown(payload: ExportPayload): string {
  const { blueprint } = payload;
  const phases = [...new Set(blueprint.tasks.map((t) => t.phase))];
  const lines = ['# Implementation tasks', ''];
  for (const phase of phases) {
    lines.push(`## ${phase}`, '');
    for (const task of blueprint.tasks.filter((t) => t.phase === phase)) {
      lines.push(`- [${task.done ? 'x' : ' '}] ${task.task}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function promptsMarkdown(payload: ExportPayload): string {
  return [
    '# Reusable prompts',
    '',
    ...payload.blueprint.prompts.map((p, i) => `## ${i + 1}\n\n\`\`\`\n${p}\n\`\`\``)
  ].join('\n');
}

export async function buildExportZip(payload: ExportPayload): Promise<Blob> {
  const zip = new JSZip();
  const { blueprint } = payload;

  zip.file('README.md', blueprint.readmeMarkdown);
  zip.file('TASKS.md', tasksMarkdown(payload));
  zip.file('ARCHITECTURE.md', architectureMarkdown(payload));
  zip.file('prompts.md', promptsMarkdown(payload));
  zip.file('schema.prisma', blueprint.databaseSchema);
  zip.file('.env.example', blueprint.envExample);

  for (const file of blueprint.starterFiles) {
    zip.file(file.path, file.content);
  }

  const metadata = {
    exportedAt: new Date().toISOString(),
    idea: payload.idea,
    projectName: payload.projectName
  };
  zip.file('blueprint.json', JSON.stringify(metadata, null, 2));

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}
