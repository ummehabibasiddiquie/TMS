import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isFinalQuizCertVisibleToTrainee } from "@/lib/final-evaluation";

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
            include: {
              reviewedBy: { select: { id: true, name: true, role: true } },
            },
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
      reviewedById: true,
      reviewNote: true,
      reviewedBy: { select: { id: true, name: true, role: true } },
    },
  });

  const profile = await prisma.traineeProfile.findUnique({
    where: { userId: user.id },
    select: { evaluationCycle: true },
  });
  const currentCycle = profile?.evaluationCycle ?? 1;

  const currentCycleCerts = finalQuizCertificates.filter(
    (cert) => cert.cycle === currentCycle
  );

  // Only reviewer-approved certificates for the current cycle are visible to trainees.
  const activeFinalQuizCertificates = currentCycleCerts.filter((cert) =>
    isFinalQuizCertVisibleToTrainee(cert)
  );
  const pendingFinalQuizCertificate =
    currentCycleCerts.find(
      (cert) =>
        !isFinalQuizCertVisibleToTrainee(cert) && cert.status === "PENDING_REVIEW"
    ) ?? null;
  const rejectedFinalQuizCertificate =
    currentCycleCerts.find((cert) => cert.status === "REJECTED") ?? null;

  return NextResponse.json({
    projects,
    finalQuizCertificates: activeFinalQuizCertificates,
    pendingFinalQuizCertificate,
    rejectedFinalQuizCertificate,
    previousFinalQuizCertificates: finalQuizCertificates.filter(
      (cert) => cert.cycle < currentCycle
    ),
  });
}
