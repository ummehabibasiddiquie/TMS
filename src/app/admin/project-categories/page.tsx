import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ProjectCategoriesManager } from "@/components/admin/ProjectCategoriesManager";
import { prisma } from "@/lib/db";

export default async function AdminProjectCategoriesPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/");

  const categories = await prisma.projectCategory.findMany({
    where: { deletedAt: null },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          projects: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  }) as any;

  return <ProjectCategoriesManager categories={categories} user={user} />;
}
