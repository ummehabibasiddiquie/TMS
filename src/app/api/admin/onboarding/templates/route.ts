import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET all onboarding templates
export async function GET() {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await (prisma as any).onboardingTemplate.findMany({
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
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ templates });
}

// POST create new onboarding template
export async function POST(req: Request) {
  const user = await requireSession(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const template = await (prisma as any).onboardingTemplate.create({
    data: {
      name,
      description
    }
  });

  return NextResponse.json({ template }, { status: 201 });
}