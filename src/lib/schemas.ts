import { z } from 'zod';

export const DifficultySchema = z.enum(['easy', 'medium', 'hard']);

export const IdeaBriefSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(3).max(140),
  targetUser: z.string().min(3).max(200),
  painPoint: z.string().min(10).max(600),
  whyNow: z.string().min(10).max(600),
  existingAlternatives: z.array(z.string().min(1)).min(1).max(8),
  mvpFeatures: z.array(z.string().min(1)).min(2).max(10),
  techStack: z.array(z.string().min(1)).min(1).max(10),
  difficulty: DifficultySchema,
  starPotential: z.number().int().min(0).max(100),
  monetization: z.string().min(3).max(300),
  sources: z.array(z.string()).default([])
});

export const IdeaBriefArraySchema = z.array(IdeaBriefSchema).length(5, {
  message: 'Trend Scout must return exactly 5 ideas'
});

export type IdeaBrief = z.infer<typeof IdeaBriefSchema>;

export const ApiRouteSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  path: z.string().min(1),
  purpose: z.string().min(1)
});

export const UiPageSchema = z.object({
  path: z.string().min(1),
  purpose: z.string().min(1),
  components: z.array(z.string()).default([])
});

export const BlueprintTaskSchema = z.object({
  phase: z.string().min(1),
  task: z.string().min(1),
  done: z.boolean().default(false)
});

export const StarterFileSchema = z.object({
  path: z.string().min(1),
  content: z.string()
});

export const RepoBlueprintSchema = z.object({
  projectName: z.string().min(1),
  tagline: z.string().min(1).max(200),
  description: z.string().min(10),
  readmeMarkdown: z.string().min(50),
  techStack: z.array(z.string().min(1)).min(1),
  folderTree: z.string().min(10),
  databaseSchema: z.string().min(10),
  apiRoutes: z.array(ApiRouteSchema).min(1),
  uiPages: z.array(UiPageSchema).min(1),
  tasks: z.array(BlueprintTaskSchema).min(1),
  prompts: z.array(z.string().min(1)).min(1),
  starterFiles: z.array(StarterFileSchema).default([]),
  envExample: z.string().min(1)
});

export type RepoBlueprint = z.infer<typeof RepoBlueprintSchema>;

export const ScoutRequestSchema = z.object({
  niche: z.string().min(2).max(120),
  keywords: z.array(z.string().min(1)).max(12).default([]),
  sources: z
    .array(z.enum(['github', 'hackernews', 'reddit', 'web']))
    .min(1, 'Pick at least one source')
    .default(['github', 'hackernews'])
});

export type ScoutRequest = z.infer<typeof ScoutRequestSchema>;

export const ArchitectRequestSchema = z.object({
  ideaBrief: IdeaBriefSchema
});

export const ExportRequestSchema = z.object({
  projectId: z.string().min(1)
});

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  niche: z.string().min(2).max(120)
});

export type SourceName = ScoutRequest['sources'][number];
