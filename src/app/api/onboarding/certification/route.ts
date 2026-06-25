import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { landscapeQuiz } from "@/lib/onboarding-data";
import { recordCertification } from "@/lib/onboarding";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const user = await requireSession(["TRAINEE", "ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectKey = "landscape", answers } = await req.json();
  if (!answers || typeof answers !== "object") {
    return NextResponse.json({ error: "answers required" }, { status: 400 });
  }

  const parsed = answers as Record<string, number>;
  let correct = 0;
  landscapeQuiz.forEach((question, index) => {
    if (parsed[String(index)] === question.correctIndex) correct++;
  });

  const score = (correct / landscapeQuiz.length) * 100;
  const passed = score >= 80;

  // Find project by key (name matching projectKey)
  const project = await prisma.project.findFirst({
    where: { 
      name: projectKey,
      active: true 
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  await recordCertification(user.id, project.id, score, passed);

  return NextResponse.json({
    score,
    passed,
    passingScore: 80,
    total: landscapeQuiz.length,
    correct,
  });
}
