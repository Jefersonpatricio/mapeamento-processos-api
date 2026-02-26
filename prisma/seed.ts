import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Iniciando seed...");

  // ─── Usuários ────────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: "admin@mangoconsulting.com" },
    update: {},
    create: {
      email: "admin@mangoconsulting.com",
      name: "Administrador",
      password: await bcrypt.hash("stage123", 10),
      role: "admin",
    },
  });

  await prisma.user.upsert({
    where: { email: "user@mangoconsulting.com" },
    update: {},
    create: {
      email: "user@mangoconsulting.com",
      name: "Usuário Padrão",
      password: await bcrypt.hash("stage123", 10),
      role: "user",
    },
  });

  console.log("✅ Usuários criados");

  // ─── Departamentos ───────────────────────────────────────────────────────────
  const depts = [
    { name: "Recursos Humanos", slug: "rh", description: "Gestão de pessoas" },
    {
      name: "Financeiro",
      slug: "financeiro",
      description: "Departamento financeiro e contábil",
    },
    { name: "Tecnologia", slug: "ti", description: "Tecnologia da informação" },
    {
      name: "Marketing",
      slug: "marketing",
      description: "Marketing e comunicação",
    },
  ];

  const departments: Record<string, string> = {};

  for (const dept of depts) {
    const created = await prisma.department.upsert({
      where: { slug: dept.slug },
      update: {},
      create: { ...dept, createdById: admin.id },
    });
    departments[dept.slug] = created.id;
  }

  console.log("✅ Departamentos criados");

  // ─── Processos base ──────────────────────────────────────────────────────────
  const processes = [
    {
      name: "Recrutamento e Seleção",
      description: "Processo de ponta a ponta para novas contratações",
      type: "manual",
      criticality: "alta",
      departmentId: departments["rh"],
      tools: ["Trello", "Notion"],
      responsibles: ["Equipe de RH"],
    },
    {
      name: "Gestão de Incidentes",
      description: "Processo de atendimento a incidentes de TI",
      type: "sistemático",
      criticality: "alta",
      departmentId: departments["ti"],
      tools: ["Jira", "Slack"],
      responsibles: ["DevOps", "Suporte"],
    },
    {
      name: "Fechamento Mensal",
      description: "Processo de fechamento contábil mensal",
      type: "sistemático",
      criticality: "alta",
      departmentId: departments["financeiro"],
      tools: ["SAP", "Excel"],
      responsibles: ["Contabilidade"],
    },
  ];

  for (const proc of processes) {
    const existing = await prisma.process.findFirst({
      where: { name: proc.name, departmentId: proc.departmentId },
    });
    if (!existing) {
      await prisma.process.create({
        data: { ...proc, createdById: admin.id },
      });
    }
  }

  console.log("✅ Processos criados");

  console.log("\n✨ Seed finalizado!");
  console.log("   Admin: admin@mangoconsulting.com / stage123");
  console.log("   User:  user@mangoconsulting.com  / stage123");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
