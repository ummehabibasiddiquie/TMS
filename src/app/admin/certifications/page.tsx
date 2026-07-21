"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CertificationApprovalsManager } from "@/components/admin/CertificationApprovalsManager";
import type { Role } from "@/types";

export default function CertificationApprovalsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((data) => {
        const role = data.user?.role as Role | undefined;
        if (!data.user) {
          router.push("/login");
          return;
        }
        if (role !== "ADMIN" && role !== "TRAINER") {
          router.push("/");
          return;
        }
        setReady(true);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  if (!ready) {
    return <p className="text-slate-400">Loading…</p>;
  }

  return <CertificationApprovalsManager />;
}
