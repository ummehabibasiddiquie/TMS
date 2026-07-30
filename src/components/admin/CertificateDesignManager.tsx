"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Save, Upload, ImageIcon, RotateCcw } from "lucide-react";
import {
  CertificateDocument,
  type CertificateData,
} from "@/components/certifications/CertificateDocument";
import {
  DEFAULT_CERTIFICATE_BRAND,
  type CertificateBrandSettings,
} from "@/lib/certificate-brand";
import { prepareSignaturePng } from "@/lib/signature-image";
import { SectionLoader, WorkingBanner } from "@/components/ui/SectionLoader";

const panelCard =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/40 dark:shadow-none";

const fieldClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:shadow-none";

const labelClass = "text-xs font-medium text-slate-700 dark:text-slate-400";

const sectionTitle =
  "text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500";

/** Design-time certificate width (px); preview scales to fit the column. */
const CERT_PREVIEW_DESIGN_WIDTH = 920;
const CERT_PREVIEW_DESIGN_HEIGHT = CERT_PREVIEW_DESIGN_WIDTH / 1.414;

function ScaledCertificatePreview({
  data,
  brand,
}: {
  data: CertificateData;
  brand: CertificateBrandSettings;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w <= 0) return;
      setScale(w / CERT_PREVIEW_DESIGN_WIDTH);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={hostRef}
      className="w-full overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
      style={{ height: CERT_PREVIEW_DESIGN_HEIGHT * scale }}
    >
      <div
        style={{
          width: CERT_PREVIEW_DESIGN_WIDTH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <CertificateDocument
          data={data}
          brand={brand}
          compact={false}
          layoutWidth={CERT_PREVIEW_DESIGN_WIDTH}
        />
      </div>
    </div>
  );
}

export function CertificateDesignManager() {
  const [brand, setBrand] = useState<CertificateBrandSettings>(
    DEFAULT_CERTIFICATE_BRAND
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"signature" | "logo" | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [previewKind, setPreviewKind] = useState<"project" | "final_quiz">(
    "project"
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/certificate-brand");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load");
        return;
      }
      setBrand(data.brand);
      setError("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function setField<K extends keyof CertificateBrandSettings>(
    key: K,
    value: CertificateBrandSettings[K]
  ) {
    setBrand((b) => ({ ...b, [key]: value }));
  }

  async function uploadImage(
    file: File,
    field: "signatureImageUrl" | "logoImageUrl"
  ) {
    setUploading(field === "signatureImageUrl" ? "signature" : "logo");
    setMsg("");
    setError("");
    try {
      let toUpload = file;
      if (field === "signatureImageUrl") {
        try {
          toUpload = await prepareSignaturePng(file);
        } catch {
          // Fall back to original file if canvas processing fails
          toUpload = file;
        }
      }
      const fd = new FormData();
      fd.append("file", toUpload);
      fd.append("folder", "certificates");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }
      setField(field, data.url);
      setMsg(
        field === "signatureImageUrl"
          ? "Signature cleaned (paper removed) and uploaded. Save design to apply."
          : `Logo uploaded → ${data.url}`
      );
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function save() {
    setSaving(true);
    setMsg("");
    setError("");
    try {
      const res = await fetch("/api/certificate-brand", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brand),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save");
        return;
      }
      setBrand(data.brand);
      setMsg("Certificate design saved. New certificates will use this look.");
    } catch {
      setError("Could not save");
    } finally {
      setSaving(false);
    }
  }

  const preview: CertificateData = {
    recipientName: "Sample Trainee",
    projectName:
      previewKind === "final_quiz"
        ? "Sample Training Program"
        : "Sample Project Training",
    categoryName: previewKind === "final_quiz" ? "Final Quiz" : "Preview",
    score: 92,
    certifiedAt: new Date().toISOString(),
    certificateId: "preview0001",
    kind: previewKind,
    isPreview: true,
  };

  if (loading) {
    return <SectionLoader message="Loading certificate design…" />;
  }

  return (
    <div className="space-y-4">
      {(saving || uploading) && (
        <WorkingBanner
          message={
            uploading
              ? `Uploading ${uploading}…`
              : "Saving certificate design…"
          }
        />
      )}
      {msg && !saving && !uploading && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
          {msg}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          {error}
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className={`${panelCard} space-y-5`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Design settings
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Saved to{" "}
                <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">
                  data/certificate-brand.json
                </code>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setBrand({ ...DEFAULT_CERTIFICATE_BRAND })}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:shadow-none dark:hover:bg-slate-800"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save design
              </button>
            </div>
          </div>
          <section className="space-y-3">
            <h3 className={sectionTitle}>Company branding</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                Brand name
                <input
                  value={brand.brandName}
                  onChange={(e) => setField("brandName", e.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className={labelClass}>
                Tagline
                <input
                  value={brand.tagline}
                  onChange={(e) => setField("tagline", e.target.value)}
                  className={fieldClass}
                />
              </label>
            </div>
            <div>
              <p className={labelClass}>Logo image (optional)</p>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                {brand.logoImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={brand.logoImageUrl}
                    alt="Logo"
                    className="h-12 rounded border border-slate-200 bg-white object-contain p-1 dark:border-slate-700"
                  />
                ) : (
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded border border-dashed border-slate-300 text-slate-400 dark:border-slate-700 dark:text-slate-600">
                    <ImageIcon className="h-5 w-5" />
                  </span>
                )}
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800">
                  <Upload className="h-3.5 w-3.5" />
                  Upload logo
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadImage(f, "logoImageUrl");
                      e.target.value = "";
                    }}
                  />
                </label>
                {brand.logoImageUrl && (
                  <button
                    type="button"
                    className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                    onClick={() => setField("logoImageUrl", null)}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <h3 className={sectionTitle}>Signature</h3>
            <p className="text-xs text-slate-600 dark:text-slate-500">
              Re-upload the signature JPG. Paper/beige background is removed automatically
              and the ink is shown in gold on the white certificate. Then click Save design.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {brand.signatureImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={brand.signatureImageUrl}
                  alt="Signature"
                  className="h-14 max-w-[200px] rounded border border-slate-200 bg-white object-contain p-1 dark:border-slate-700"
                />
              ) : (
                <span className="text-sm italic text-slate-600 dark:text-slate-500">
                  Using text mark: {brand.signatoryMark}
                </span>
              )}
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800">
                <Upload className="h-3.5 w-3.5" />
                Upload signature JPG
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadImage(f, "signatureImageUrl");
                    e.target.value = "";
                  }}
                />
              </label>
              {brand.signatureImageUrl && (
                <button
                  type="button"
                    className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                  onClick={() => setField("signatureImageUrl", null)}
                >
                  Use text mark instead
                </button>
              )}
            </div>
            <label className={`block ${labelClass}`}>
              Signature image URL / path
              <input
                value={brand.signatureImageUrl || ""}
                onChange={(e) =>
                  setField(
                    "signatureImageUrl",
                    e.target.value.trim() || null
                  )
                }
                placeholder="/uploads/certificates/signature.jpg"
                className={fieldClass}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className={labelClass}>
                Signatory name
                <input
                  value={brand.signatoryName}
                  onChange={(e) => setField("signatoryName", e.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className={labelClass}>
                Title
                <input
                  value={brand.signatoryTitle}
                  onChange={(e) => setField("signatoryTitle", e.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className={labelClass}>
                Text mark (if no image)
                <input
                  value={brand.signatoryMark}
                  onChange={(e) => setField("signatoryMark", e.target.value)}
                  className={fieldClass}
                />
              </label>
            </div>
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <h3 className={sectionTitle}>Titles & messages (training content)</h3>
            <p className="text-xs text-slate-600 dark:text-slate-500">
              Visual layout follows the company certificate style. Wording is for{" "}
              <strong className="font-medium text-slate-800 dark:text-slate-400">
                training completion
              </strong>
              , not Rising Star of the Month. Placeholders:{" "}
              <code className="rounded bg-slate-100 px-1 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {"{name}"}
              </code>
              ,{" "}
              <code className="rounded bg-slate-100 px-1 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {"{score}"}
              </code>
              ,{" "}
              <code className="rounded bg-slate-100 px-1 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {"{project}"}
              </code>
            </p>
            <label className={`block ${labelClass}`}>
              Line above name
              <input
                value={brand.presentedLabel}
                onChange={(e) => setField("presentedLabel", e.target.value)}
                className={fieldClass}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                Project title (script)
                <input
                  value={brand.projectTitleScript}
                  onChange={(e) =>
                    setField("projectTitleScript", e.target.value)
                  }
                  className={fieldClass}
                />
              </label>
              <label className={labelClass}>
                Project subtitle
                <input
                  value={brand.projectTitleSub}
                  onChange={(e) => setField("projectTitleSub", e.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className={labelClass}>
                Final quiz title (script)
                <input
                  value={brand.finalQuizTitleScript}
                  onChange={(e) =>
                    setField("finalQuizTitleScript", e.target.value)
                  }
                  className={fieldClass}
                />
              </label>
              <label className={labelClass}>
                Final quiz subtitle
                <input
                  value={brand.finalQuizTitleSub}
                  onChange={(e) =>
                    setField("finalQuizTitleSub", e.target.value)
                  }
                  className={fieldClass}
                />
              </label>
            </div>
            <label className={`block ${labelClass}`}>
              Project / training certificate message
              <textarea
                rows={3}
                value={brand.projectMessage}
                onChange={(e) => setField("projectMessage", e.target.value)}
                className={fieldClass}
              />
            </label>
            <label className={`block ${labelClass}`}>
              Final quiz message
              <textarea
                rows={3}
                value={brand.finalQuizMessage}
                onChange={(e) => setField("finalQuizMessage", e.target.value)}
                className={fieldClass}
              />
            </label>
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <h3 className={sectionTitle}>Colors</h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-500">
              Each color updates specific parts of the certificate. Watch the live
              preview while you change them.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  {
                    key: "colorNavy" as const,
                    label: "Navy",
                    affects:
                      "Main text, name, date, signature line, and corner ribbons",
                  },
                  {
                    key: "colorGreen" as const,
                    label: "Green",
                    affects:
                      "Category, score, signatory title, and small accents",
                  },
                  {
                    key: "colorGold" as const,
                    label: "Gold",
                    affects: "Border frame, certified seal, ribbons, and signature ink",
                  },
                ] as const
              ).map(({ key, label, affects }) => (
                <label key={key} className={labelClass}>
                  {label}
                  <div className="mt-1 flex gap-2">
                    <input
                      type="color"
                      value={brand[key]}
                      onChange={(e) => setField(key, e.target.value)}
                      className="h-9 w-10 shrink-0 cursor-pointer rounded border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950"
                    />
                    <input
                      value={brand[key]}
                      onChange={(e) => setField(key, e.target.value)}
                      className={`${fieldClass} mt-0`}
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] leading-snug text-slate-500">
                    {affects}
                  </p>
                </label>
              ))}
            </div>
          </section>

          <p className="text-xs text-slate-600 dark:text-slate-500">
            After saving, open{" "}
            <Link
              href="/admin/certifications"
              className="font-medium text-blue-700 hover:underline dark:text-blue-400"
            >
              Cert Approvals
            </Link>{" "}
            or a trainee&apos;s Certifications page to view/download.
          </p>
        </div>

        <aside
          className={`${panelCard} lg:sticky lg:top-6 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto`}
        >
          <div className="mb-3 space-y-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Live preview
              </h2>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-500">
                Project vs final quiz certificate layout.
              </p>
            </div>
            <div
              className="inline-flex w-full rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-950"
              role="tablist"
            >
              <button
                type="button"
                role="tab"
                aria-selected={previewKind === "project"}
                onClick={() => setPreviewKind("project")}
                className={`flex-1 rounded-md px-3 py-2 transition ${
                  previewKind === "project"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-700 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                Project
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={previewKind === "final_quiz"}
                onClick={() => setPreviewKind("final_quiz")}
                className={`flex-1 rounded-md px-3 py-2 transition ${
                  previewKind === "final_quiz"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-700 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                Final quiz
              </button>
            </div>
          </div>
          <ScaledCertificatePreview data={preview} brand={brand} />
        </aside>
      </div>
    </div>
  );
}
