"use client";

import { useEffect } from "react";
import { Download, Printer, X } from "lucide-react";
import { COMPANY_ORG_NAME } from "@/lib/onboarding-org";
import { printCertificate } from "@/lib/print-certificate";

export type CertificateData = {
  recipientName: string;
  projectName: string;
  categoryName?: string | null;
  score: number;
  certifiedAt: string | Date;
  certificateId: string;
  /** When true, shows a SAMPLE watermark (preview before earning). */
  isPreview?: boolean;
  /** project = project quiz cert; final_quiz = Final Quiz completion cert */
  kind?: "project" | "final_quiz";
};

function formatDate(value: string | Date) {
  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return String(value);
  }
}

/** Formal certificate layout — used in modal and print/download. */
export function CertificateDocument({ data }: { data: CertificateData }) {
  return (
    <div
      className="certificate-sheet mx-auto w-full max-w-[800px] bg-[#faf8f4] text-[#1a2332]"
      style={{
        aspectRatio: "1.414 / 1",
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      <div className="relative flex h-full flex-col border-[10px] border-[#1e3a5f] p-6 sm:p-10">
        <div className="pointer-events-none absolute inset-3 border border-[#c4a35a]/60" />
        {data.isPreview && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden">
            <span className="-rotate-12 text-5xl font-bold uppercase tracking-[0.3em] text-[#1e3a5f]/15 sm:text-7xl">
              Sample
            </span>
          </div>
        )}

        <div className="relative z-10 flex flex-1 flex-col items-center justify-between text-center">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#1e3a5f] sm:text-xs">
              {COMPANY_ORG_NAME}
            </p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-[#8a7350] sm:text-xs">
              Training Hub
            </p>
            <h1 className="mt-4 text-2xl font-bold tracking-wide text-[#1e3a5f] sm:mt-6 sm:text-4xl">
              Certificate of Completion
            </h1>
            <div className="mx-auto mt-3 h-px w-24 bg-[#c4a35a] sm:mt-4 sm:w-32" />
          </div>

          <div className="my-4 px-2 sm:my-6">
            <p className="text-sm text-[#5a6570] sm:text-base">This is to certify that</p>
            <p className="mt-2 text-xl font-bold text-[#1a2332] sm:mt-3 sm:text-3xl">
              {data.recipientName}
            </p>
            <p className="mt-3 text-sm text-[#5a6570] sm:mt-4 sm:text-base">
              {data.kind === "final_quiz"
                ? "has completed the Final Quiz evaluation with the score below for"
                : "has successfully completed training and passed the certification assessment for"}
            </p>
            <p className="mt-2 text-lg font-semibold text-[#1e3a5f] sm:mt-3 sm:text-2xl">
              {data.projectName}
            </p>
            {data.categoryName && (
              <p className="mt-1 text-sm text-[#8a7350]">{data.categoryName}</p>
            )}
          </div>

          <div className="grid w-full max-w-md grid-cols-2 gap-4 text-left text-xs sm:gap-8 sm:text-sm">
            <div>
              <p className="uppercase tracking-wider text-[#8a7350]">Score</p>
              <p className="mt-1 font-semibold text-[#1a2332]">{Math.round(data.score)}%</p>
            </div>
            <div>
              <p className="uppercase tracking-wider text-[#8a7350]">Date awarded</p>
              <p className="mt-1 font-semibold text-[#1a2332]">{formatDate(data.certifiedAt)}</p>
            </div>
          </div>

          <div className="mt-6 flex w-full max-w-lg items-end justify-between gap-4 pt-4 sm:mt-8">
            <div className="flex-1 border-t border-[#1a2332]/30 pt-2 text-left">
              <p className="text-[10px] uppercase tracking-wider text-[#8a7350]">Authorized</p>
              <p className="text-xs font-medium text-[#1a2332] sm:text-sm">Training Hub</p>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-[#c4a35a] text-[9px] font-bold uppercase tracking-wide text-[#1e3a5f] sm:h-16 sm:w-16 sm:text-[10px]">
              Certified
            </div>
            <div className="flex-1 border-t border-[#1a2332]/30 pt-2 text-right">
              <p className="text-[10px] uppercase tracking-wider text-[#8a7350]">Certificate ID</p>
              <p className="truncate font-mono text-[10px] text-[#1a2332] sm:text-xs">
                {data.certificateId.slice(0, 12).toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CertificateModal({
  data,
  open,
  onClose,
}: {
  data: CertificateData | null;
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !data) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-white">
              {data.isPreview ? "Sample certificate preview" : "Certificate"}
            </p>
            <p className="text-xs text-slate-400">
              {data.isPreview
                ? "This is what you will get after you pass the project quiz."
                : data.projectName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => printCertificate(data)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
            <button
              type="button"
              onClick={() => printCertificate(data)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-slate-800/50 p-4 sm:p-6">
          <CertificateDocument data={data} />
        </div>
      </div>
    </div>
  );
}
