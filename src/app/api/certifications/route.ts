import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await requireSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only projects actually assigned to this employee
  const assignments = await prisma.projectAssignment.findMany({
    where: {
      userId: user.id,
      status: { notIn: ["REMOVED", "CANCELLED"] },
      project: { active: true },
    },
    include: {
      project: {
        include: {
          categoryRel: {
            select: { id: true, name: true },
          },
          certifications: {
            where: { userId: user.id },
            orderBy: { certifiedAt: "desc" },
          },
        },
      },
    },
    orderBy: { assignedAt: "asc" },
  });

  const projects = assignments.map((a) => ({
    id: a.project.id,
    name: a.project.name,
    categoryRel: a.project.categoryRel,
    assignmentStatus: a.status,
    certifications: a.project.certifications,
  }));

  const finalQuizCertificates = await prisma.finalQuizCertificate.findMany({
    where: { userId: user.id },
    orderBy: { certifiedAt: "desc" },
    select: {
      id: true,
      quizTitle: true,
      score: true,
      cycle: true,
      status: true,
      certifiedAt: true,
    },
  });

  return NextResponse.json({ projects, finalQuizCertificates });
}
