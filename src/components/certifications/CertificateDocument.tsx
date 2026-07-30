"use client";

import { useEffect, useState } from "react";
import { Download, Printer, X } from "lucide-react";
import { printCertificate } from "@/lib/print-certificate";
import {
  DEFAULT_CERTIFICATE_BRAND,
  certificateMessage,
  certificateTitle,
  formatCertMonthYear,
  type CertificateBrandSettings,
  type CertificateKind,
} from "@/lib/certificate-brand";
import { CertificateSignature } from "@/components/certifications/CertificateSignature";

export type CertificateData = {
  recipientName: string;
  projectName: string;
  categoryName?: string | null;
  score: number;
  certifiedAt: string | Date;
  certificateId: string;
  isPreview?: boolean;
  kind?: CertificateKind;
};

function CornerRibbon({
  position,
  navy,
  gold,
}: {
  position: "top-right" | "bottom-left";
  navy: string;
  gold: string;
}) {
  const isTop = position === "top-right";
  return (
    <svg
      className={`pointer-events-none absolute z-0 ${
        isTop ? "right-0 top-0" : "bottom-0 left-0 rotate-180"
      }`}
      width="220"
      height="180"
      viewBox="0 0 220 180"
      aria-hidden
    >
      <path
        d="M220 0 H95 C130 35 155 70 170 110 C185 145 200 165 220 180 Z"
        fill={navy}
      />
      <path
        d="M220 0 H130 C150 40 165 75 175 105 C188 140 200 160 220 175 Z"
        fill={gold}
        opacity="0.95"
      />
      <path
        d="M220 0 H155 C168 45 178 80 185 110 C195 140 205 158 220 170 Z"
        fill={navy}
      />
    </svg>
  );
}

function GoldSeal({ gold, navy }: { gold: string; navy: string }) {
  const gid = `sealGold-${gold.replace("#", "")}`;
  return (
    <div className="relative z-10 flex h-[72px] w-[72px] items-center justify-center sm:h-[88px] sm:w-[88px]">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full drop-shadow-md">
        <defs>
          <radialGradient id={gid} cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#f5e6a8" />
            <stop offset="45%" stopColor={gold} />
            <stop offset="100%" stopColor="#a67c00" />
          </radialGradient>
        </defs>
        <polygon
          fill={`url(#${gid})`}
          points="50,2 56,18 74,8 70,26 90,28 74,40 92,55 72,55 78,74 60,62 55,82 50,66 45,82 40,62 22,74 28,55 8,55 26,40 10,28 30,26 26,8 44,18"
        />
        <circle cx="50" cy="48" r="22" fill={navy} />
        <circle cx="50" cy="48" r="18" fill="none" stroke="#f5e6a8" strokeWidth="1.5" />
        <text
          x="50"
          y="46"
          textAnchor="middle"
          fill="#f5e6a8"
          fontSize="9"
          fontFamily="Montserrat, sans-serif"
          fontWeight="700"
          letterSpacing="0.06em"
        >
          CERT
        </text>
        <text
          x="50"
          y="58"
          textAnchor="middle"
          fill="#f5e6a8"
          fontSize="7"
          fontFamily="Montserrat, sans-serif"
          fontWeight="600"
        >
          IFIED
        </text>
      </svg>
    </div>
  );
}

export function CertificateDocument({
  data,
  brand = DEFAULT_CERTIFICATE_BRAND,
  compact = false,
  layoutWidth,
}: {
  data: CertificateData;
  brand?: CertificateBrandSettings;
  /** Smaller spacing for admin live preview so message/footer stay visible */
  compact?: boolean;
  /** Fixed pixel width (e.g. admin preview scaled to fit column) */
  layoutWidth?: number;
}) {
  const title = certificateTitle(data.kind, brand);
  const message = certificateMessage(
    {
      kind: data.kind,
      projectName: data.projectName,
      score: data.score,
      recipientName: data.recipientName,
    },
    brand
  );
  const monthYear = formatCertMonthYear(data.certifiedAt);
  const navy = brand.colorNavy;
  const green = brand.colorGreen;
  const gold = brand.colorGold;

  return (
    <div
      className={`certificate-sheet relative bg-white ${
        layoutWidth ? "max-w-none" : "mx-auto w-full max-w-[920px]"
      } ${compact ? "overflow-visible" : "overflow-hidden"}`}
      style={{
        width: layoutWidth ? layoutWidth : undefined,
        aspectRatio: compact ? undefined : "1.414 / 1",
        minHeight: compact ? 420 : undefined,
        fontFamily: "Montserrat, ui-sans-serif, system-ui, sans-serif",
        color: navy,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Montserrat:wght@400;500;600;700;800&display=swap');
      `}</style>

      <div
        className={`relative flex h-full flex-col ${
          compact ? "p-4 sm:p-5" : "p-5 sm:p-7"
        }`}
      >
        <div
          className="pointer-events-none absolute inset-3 rounded-sm border-[1.5px] sm:inset-4"
          style={{ borderColor: gold }}
        />

        <CornerRibbon position="top-right" navy={navy} gold={gold} />
        <CornerRibbon position="bottom-left" navy={navy} gold={gold} />

        {data.isPreview && (
          <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center overflow-hidden">
            <span
              className="-rotate-12 text-4xl font-bold uppercase tracking-[0.3em] sm:text-6xl"
              style={{ color: navy, opacity: 0.06 }}
            >
              Sample
            </span>
          </div>
        )}

        <div className="relative z-10 flex items-start justify-between pr-2 pt-1">
          <div className="pl-1">
            {brand.logoImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brand.logoImageUrl}
                alt={brand.brandName}
                className="mb-1 h-9 max-w-[140px] object-contain sm:h-11"
              />
            ) : (
              <>
                <p
                  className={`font-extrabold italic tracking-tight ${
                    compact ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"
                  }`}
                  style={{ color: navy }}
                >
                  {brand.brandName}
                  <span
                    className="relative ml-0.5 inline-block align-top text-[10px]"
                    style={{ color: green }}
                  >
                    ▲
                  </span>
                </p>
                {brand.tagline ? (
                  <p
                    className="mt-0.5 text-[10px] font-medium tracking-wide sm:text-xs"
                    style={{ color: green }}
                  >
                    {brand.tagline}
                  </p>
                ) : null}
              </>
            )}
          </div>
          <div className="mr-4 mt-1 sm:mr-8">
            <GoldSeal gold={gold} navy={navy} />
          </div>
        </div>

        <div
          className={`relative z-10 flex flex-1 flex-col items-center px-3 text-center sm:px-8 ${
            compact ? "justify-start pt-2" : "justify-center"
          }`}
        >
          <h1
            className={`leading-none ${
              compact
                ? "text-3xl sm:text-4xl"
                : "text-4xl sm:text-5xl md:text-6xl"
            }`}
            style={{ fontFamily: "'Great Vibes', cursive", color: navy }}
          >
            {title.script}
          </h1>
          <p
            className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] sm:text-xs"
            style={{ color: green }}
          >
            {title.sub}
          </p>

          <p
            className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] sm:mt-4 sm:text-xs"
            style={{ color: green }}
          >
            {brand.presentedLabel}
          </p>
          <p
            className={`mt-1.5 leading-tight ${
              compact
                ? "text-2xl sm:text-3xl"
                : "text-3xl sm:text-4xl md:text-5xl"
            }`}
            style={{ fontFamily: "'Great Vibes', cursive", color: navy }}
          >
            {data.recipientName}
          </p>
          <div
            className="mx-auto mt-2 h-px w-36 sm:w-48"
            style={{ backgroundColor: gold }}
          />

          <p
            className={`mt-3 max-w-lg leading-relaxed sm:mt-4 ${
              compact ? "text-[11px] sm:text-xs" : "text-xs sm:text-sm"
            }`}
            style={{ color: navy, opacity: 0.9 }}
          >
            {message || (
              <span className="italic opacity-50">
                (Add a project / training message above to see it here)
              </span>
            )}
          </p>

          <p
            className={`mt-2 font-semibold ${
              compact ? "text-xs sm:text-sm" : "text-sm sm:text-base"
            }`}
            style={{ color: navy }}
          >
            {data.projectName}
          </p>
          {data.categoryName && (
            <p className="mt-0.5 text-[10px] sm:text-xs" style={{ color: green }}>
              {data.categoryName}
            </p>
          )}
          <p className="mt-1 text-[10px] tabular-nums" style={{ color: green }}>
            Score: {Math.round(data.score)}%
          </p>
          <p
            className={`mt-3 font-bold tabular-nums ${
              compact ? "text-xs sm:text-sm" : "text-sm sm:text-base"
            }`}
            style={{ color: navy }}
          >
            {monthYear}
          </p>
          <p
            className="mt-0.5 font-mono text-[9px] tracking-wide"
            style={{ color: navy, opacity: 0.45 }}
          >
            ID {data.certificateId.slice(0, 10).toUpperCase()}
          </p>
        </div>

        <div className="relative z-10 mt-4 flex items-end justify-end gap-4 px-2 pb-1 pt-2 sm:px-3">
          <div className="min-w-[120px] text-center sm:min-w-[160px]">
            <CertificateSignature
              src={brand.signatureImageUrl}
              fallbackMark={brand.signatoryMark}
              goldColor={gold}
              compact={compact}
            />
            <div
              className="mx-auto mt-1 h-px w-full max-w-[140px]"
              style={{ backgroundColor: navy }}
            />
            <p
              className={`mt-1 font-bold ${compact ? "text-[10px] sm:text-xs" : "text-xs sm:text-sm"}`}
              style={{ color: navy }}
            >
              {brand.signatoryName}
            </p>
            <p
              className="text-[9px] font-medium sm:text-[10px]"
              style={{ color: green }}
            >
              {brand.signatoryTitle}
            </p>
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
  brand: brandProp,
}: {
  data: CertificateData | null;
  open: boolean;
  onClose: () => void;
  brand?: CertificateBrandSettings;
}) {
  const [brand, setBrand] = useState<CertificateBrandSettings>(
    brandProp || DEFAULT_CERTIFICATE_BRAND
  );

  useEffect(() => {
    if (brandProp) {
      setBrand(brandProp);
      return;
    }
    if (!open) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/certificate-brand");
        const json = await res.json();
        if (!cancelled && res.ok && json.brand) setBrand(json.brand);
      } catch {
        /* keep defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, brandProp]);

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
        className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-white">
              {data.isPreview ? "Sample certificate preview" : "Certificate"}
            </p>
            <p className="text-xs text-slate-400">
              {data.isPreview
                ? "This is what you will get after you pass and get approved."
                : data.projectName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => printCertificate(data, brand)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
            <button
              type="button"
              onClick={() => printCertificate(data, brand)}
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
        <div className="min-h-0 flex-1 overflow-auto bg-slate-200 p-4 sm:p-6">
          <CertificateDocument data={data} brand={brand} />
        </div>
      </div>
    </div>
  );
}
