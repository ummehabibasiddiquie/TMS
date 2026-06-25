import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET single template
export async function GET(
  req: Request,
  { params }: { params: { templateId: string } }
) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const template = await (prisma as any).onboardingTemplate.findUnique({
    where: { id: params.templateId },
    include: {
      steps: {
        orderBy: { order: "asc" }
      },
      teamIntros: {
        orderBy: { order: "asc" },
        include: {
          employees: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true
                }
              }
            }
          }
        }
      },
      courses: {
        orderBy: { order: "asc" },
        include: {
          course: true,
          employeeProgress: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          quizzes: {
            include: {
              questions: {
                orderBy: { order: "asc" }
              }
            }
          }
        }
      }
    }
  });

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json({ template });
}

// PATCH update template
export async function PATCH(
  req: Request,
  { params }: { params: { templateId: string } }
) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description, isActive } = await req.json();

  const template = await (prisma as any).onboardingTemplate.update({
    where: { id: params.templateId },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(isActive !== undefined && { isActive })
    }
  });

  return NextResponse.json({ template });
}

// DELETE template
export async function DELETE(
  req: Request,
  { params }: { params: { templateId: string } }
) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await (prisma as any).onboardingTemplate.delete({
    where: { id: params.templateId }
  });

  return NextResponse.json({ success: true });
}