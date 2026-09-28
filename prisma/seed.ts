import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.project.count();
  if (existing > 0) {
    console.log(`Seed skipped: ${existing} project(s) already present.`);
    return;
  }

  const project = await prisma.project.create({
    data: { name: 'Demo: developer tooling', niche: 'developer tooling' }
  });

  await prisma.agentRun.create({
    data: {
      projectId: project.id,
      agentName: 'seed',
      inputJson: JSON.stringify({ source: 'prisma/seed.ts' }),
      outputJson: JSON.stringify({ ok: true }),
      status: 'success'
    }
  });

  console.log(`Seeded demo project ${project.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
