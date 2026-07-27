"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  LayoutDashboard,
  LogOut,
  ClipboardCheck,
  BarChart3,
  Users,
  FolderKanban,
  Award,
  UserCircle,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatRole } from "@/lib/roles";
import type { Role } from "@/types";
import { GlobalLoader } from "@/components/ui/GlobalLoader";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: Role[];
  /** Only show for trainees after day-wise schedule is complete (or quiz already taken). */
  requiresFinalQuizUnlock?: boolean;
};

const navItems: { section: string; items: NavItem[] }[] = [
  {
    section: "Getting Started",
    items: [
      { href: "/", label: "Overview", icon: LayoutDashboard, roles: ["ADMIN", "TRAINER"] },
      { href: "/onboarding", label: "Welcome", icon: ClipboardCheck, roles: ["TRAINEE"] },
    ],
  },
  {
    section: "My Learning",
    items: [
      { href: "/trainee/training", label: "Today's Work", icon: ClipboardCheck, roles: ["TRAINEE"] },
      {
        href: "/trainee/final-quiz",
        label: "Final Quiz",
        icon: Award,
        roles: ["TRAINEE"],
        requiresFinalQuizUnlock: true,
      },
      { href: "/trainee/progress", label: "Progress", icon: BarChart3, roles: ["TRAINEE"] },
      { href: "/trainee/courses", label: "Course Library", icon: BookOpen, roles: ["TRAINEE"] },
    ],
  },
  {
    section: "My Progress",
    items: [
      { href: "/certifications", label: "Certifications", icon: Award, roles: ["TRAINEE"] },
      { href: "/profile", label: "Profile", icon: UserCircle },
    ],
  },
  {
    section: "Team Lead",
    items: [
      { href: "/admin/curriculum", label: "Day Curriculum", icon: ClipboardCheck, roles: ["TRAINER"] },
      { href: "/admin/final-evaluation", label: "Final Quiz", icon: Award, roles: ["TRAINER"] },
      { href: "/trainer/courses", label: "Courses", icon: BookOpen, roles: ["TRAINER"] },
      { href: "/admin/projects", label: "Projects", icon: FolderKanban, roles: ["TRAINER"] },
      { href: "/admin/users", label: "Team Members", icon: Users, roles: ["TRAINER"] },
      { href: "/admin/progress", label: "Team Progress", icon: BarChart3, roles: ["TRAINER"] },
      { href: "/trainer/day-reviews", label: "Day Reviews", icon: ClipboardCheck, roles: ["TRAINER"] },
      { href: "/admin/certifications", label: "Cert Approvals", icon: Award, roles: ["TRAINER"] },
    ],
  },
  {
    section: "Admin",
    items: [
      { href: "/admin/users", label: "Manage Users", icon: Users, roles: ["ADMIN"] },
      { href: "/admin/curriculum", label: "Day Curriculum", icon: ClipboardCheck, roles: ["ADMIN"] },
      { href: "/admin/final-evaluation", label: "Final Quiz", icon: Award, roles: ["ADMIN"] },
      { href: "/admin/content", label: "Courses", icon: BookOpen, roles: ["ADMIN"] },
      { href: "/admin/projects", label: "Projects", icon: FolderKanban, roles: ["ADMIN"] },
      { href: "/admin/certifications", label: "Cert Approvals", icon: Award, roles: ["ADMIN"] },
      { href: "/admin/progress", label: "Progress Reports", icon: BarChart3, roles: ["ADMIN"] },
      { href: "/trainer/day-reviews", label: "Day Reviews", icon: ClipboardCheck, roles: ["ADMIN"] },
    ],
  },
];

/** Prefer the longest matching href so /trainee does not steal /trainee/training. */
function bestMatchingHref(pathname: string, hrefs: string[]) {
  const matches = hrefs.filter((href) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  });
  if (matches.length === 0) return null;
  return matches.sort((a, b) => b.length - a.length)[0];
}

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string; role: Role; email: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [finalQuizUnlocked, setFinalQuizUnlocked] = useState(false);

  useEffect(() => {
    if (user.role !== "TRAINEE") return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/final-evaluation");
        const data = await res.json();
        if (cancelled || !res.ok) return;
        setFinalQuizUnlocked(
          Boolean(data.scheduleComplete || data.attempted || data.unlocked)
        );
      } catch {
        // keep hidden until we know
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.role, pathname]);

  const canSeeItem = (item: NavItem) => {
    if (item.roles && !item.roles.includes(user.role)) return false;
    if (item.requiresFinalQuizUnlock && !finalQuizUnlocked) return false;
    return true;
  };

  const visibleHrefs = navItems.flatMap((g) =>
    g.items.filter(canSeeItem).map((i) => i.href)
  );
  const activeHref = bestMatchingHref(pathname, visibleHrefs);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      <GlobalLoader />
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="fixed right-4 top-4 z-50 rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-100 shadow lg:hidden"
        aria-label="Toggle navigation"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen w-72 flex-col border-r border-slate-800 bg-slate-950/95 backdrop-blur-xl transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="border-b border-slate-800 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
            Training Hub
          </p>
          <h1 className="mt-2 text-lg font-bold text-white">New Joiner Onboarding</h1>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto p-4">
          {navItems.map((group) => {
            const items = group.items.filter(canSeeItem);
            if (!items.length) return null;
            return (
              <div key={group.section}>
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {group.section}
                </p>
                <div className="space-y-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = activeHref === item.href;
                    return (
                      <Link
                        key={`${group.section}-${item.href}`}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
                          active
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
                            : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="border-t border-slate-800 p-4">
          <div className="mb-3 rounded-lg bg-slate-900 p-3">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-slate-500">{formatRole(user.role)}</p>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-xl px-4 py-2 text-sm text-slate-400 hover:bg-red-900/20 hover:text-red-300"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/70 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <main className="min-h-screen px-4 pb-8 pt-14 lg:ml-72 lg:px-6 lg:pb-10 lg:pt-8">
        {children}
      </main>
    </div>
  );
}
