import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { CertificateDesignManager } from "@/components/admin/CertificateDesignManager";

export default async function CertificateDesignPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/");

  return (
    <div className="mx-auto min-w-0 max-w-7xl space-y-6 pb-10">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-800 dark:text-blue-300">
          Admin
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
          Certificate design
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
          Branding, signature, wording, and colors. Save once — new certificates use the
          updated design.
        </p>
      </header>
      <CertificateDesignManager />
    </div>
  );
}
