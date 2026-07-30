/**
 * Certificate branding defaults + helpers.
 * Live settings are stored in AppConfig (id: certificate_brand) and editable by Admin.
 */

import { formatMonthYear } from "./format-date";

export type CertificateKind = "project" | "final_quiz";

export type CertificateBrandSettings = {
  brandName: string;
  tagline: string;
  signatoryName: string;
  signatoryTitle: string;
  /** Fallback script text if no signature image */
  signatoryMark: string;
  /** Uploaded JPG/PNG path, e.g. /uploads/certificates/signature.jpg */
  signatureImageUrl: string | null;
  /** Optional company logo image */
  logoImageUrl: string | null;
  /** Line above the recipient name, e.g. "This is to certify that" */
  presentedLabel: string;
  projectTitleScript: string;
  projectTitleSub: string;
  finalQuizTitleScript: string;
  finalQuizTitleSub: string;
  /**
   * Message templates. Placeholders: {name} {score} {project}
   */
  projectMessage: string;
  finalQuizMessage: string;
  colorNavy: string;
  colorGreen: string;
  colorGold: string;
};

export const DEFAULT_CERTIFICATE_BRAND: CertificateBrandSettings = {
  brandName: "TRANSFORM",
  tagline: "Solutions Simplified",
  signatoryName: "Ashfaq Shilliwala",
  signatoryTitle: "Director & CEO",
  signatoryMark: "Ashfaq",
  signatureImageUrl: null,
  logoImageUrl: null,
  presentedLabel: "This is to certify that",
  projectTitleScript: "Certificate",
  projectTitleSub: "of Completion",
  finalQuizTitleScript: "Certificate",
  finalQuizTitleSub: "of Training",
  projectMessage:
    "has successfully completed the required training and assessment for {project}, achieving a score of {score}%. This certificate is awarded in recognition of their training progress at TRANSFORM Training Hub.",
  finalQuizMessage:
    "has successfully completed the Final Quiz evaluation for onboarding training, achieving a score of {score}%. This certificate confirms completion of the Training Hub assessment requirements.",
  colorNavy: "#0b2a5b",
  colorGreen: "#2d8a4e",
  colorGold: "#d4af37",
};

/** @deprecated use DEFAULT_CERTIFICATE_BRAND — kept for older imports */
export const CERT_BRAND = {
  name: DEFAULT_CERTIFICATE_BRAND.brandName,
  tagline: DEFAULT_CERTIFICATE_BRAND.tagline,
  signatoryName: DEFAULT_CERTIFICATE_BRAND.signatoryName,
  signatoryTitle: DEFAULT_CERTIFICATE_BRAND.signatoryTitle,
  signatoryMark: DEFAULT_CERTIFICATE_BRAND.signatoryMark,
} as const;

export const CERTIFICATE_BRAND_CONFIG_ID = "certificate_brand";

export function mergeCertificateBrand(
  raw: unknown
): CertificateBrandSettings {
  const base = { ...DEFAULT_CERTIFICATE_BRAND };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const str = (k: keyof CertificateBrandSettings, fallback: string) =>
    typeof o[k] === "string" && String(o[k]).trim()
      ? String(o[k]).trim()
      : fallback;
  const url = (k: "signatureImageUrl" | "logoImageUrl") => {
    if (o[k] === null || o[k] === "") return null;
    if (typeof o[k] === "string" && String(o[k]).trim()) {
      return String(o[k]).trim();
    }
    return base[k];
  };

  return {
    brandName: str("brandName", base.brandName),
    tagline: str("tagline", base.tagline),
    signatoryName: str("signatoryName", base.signatoryName),
    signatoryTitle: str("signatoryTitle", base.signatoryTitle),
    signatoryMark: str("signatoryMark", base.signatoryMark),
    signatureImageUrl: url("signatureImageUrl"),
    logoImageUrl: url("logoImageUrl"),
    presentedLabel: str("presentedLabel", base.presentedLabel),
    projectTitleScript: str("projectTitleScript", base.projectTitleScript),
    projectTitleSub: str("projectTitleSub", base.projectTitleSub),
    finalQuizTitleScript: str(
      "finalQuizTitleScript",
      base.finalQuizTitleScript
    ),
    finalQuizTitleSub: str("finalQuizTitleSub", base.finalQuizTitleSub),
    projectMessage: str("projectMessage", base.projectMessage),
    finalQuizMessage: str("finalQuizMessage", base.finalQuizMessage),
    colorNavy: str("colorNavy", base.colorNavy),
    colorGreen: str("colorGreen", base.colorGreen),
    colorGold: str("colorGold", base.colorGold),
  };
}

/** Drop leftover Rising Star–style copy if still saved from the first template. */
export function sanitizeTrainingCopy(
  brand: CertificateBrandSettings
): CertificateBrandSettings {
  const risingStarCopy =
    /keep rising|well-deserved recognition|anything is possible|rising star/i;
  const next = { ...brand };
  if (risingStarCopy.test(next.projectMessage)) {
    next.projectMessage = DEFAULT_CERTIFICATE_BRAND.projectMessage;
  }
  if (risingStarCopy.test(next.finalQuizMessage)) {
    next.finalQuizMessage = DEFAULT_CERTIFICATE_BRAND.finalQuizMessage;
  }
  if (
    /rising star|of the month/i.test(
      `${next.projectTitleScript} ${next.projectTitleSub}`
    )
  ) {
    next.projectTitleScript = DEFAULT_CERTIFICATE_BRAND.projectTitleScript;
    next.projectTitleSub = DEFAULT_CERTIFICATE_BRAND.projectTitleSub;
  }
  if (
    /rising star|of the month/i.test(
      `${next.finalQuizTitleScript} ${next.finalQuizTitleSub}`
    )
  ) {
    next.finalQuizTitleScript = DEFAULT_CERTIFICATE_BRAND.finalQuizTitleScript;
    next.finalQuizTitleSub = DEFAULT_CERTIFICATE_BRAND.finalQuizTitleSub;
  }
  if (/this certificate is presented to/i.test(next.presentedLabel || "")) {
    // already fine for either style; prefer training wording if still default rising phrasing
  }
  if (!next.presentedLabel?.trim()) {
    next.presentedLabel = DEFAULT_CERTIFICATE_BRAND.presentedLabel;
  }
  return next;
}

export function certificateTitle(
  kind: CertificateKind | undefined,
  brand: CertificateBrandSettings = DEFAULT_CERTIFICATE_BRAND
) {
  if (kind === "final_quiz") {
    return {
      script: brand.finalQuizTitleScript,
      sub: brand.finalQuizTitleSub,
    };
  }
  return {
    script: brand.projectTitleScript,
    sub: brand.projectTitleSub,
  };
}

export function certificateMessage(
  args: {
    kind?: CertificateKind;
    projectName: string;
    score: number;
    recipientName?: string;
  },
  brand: CertificateBrandSettings = DEFAULT_CERTIFICATE_BRAND
) {
  const score = String(Math.round(args.score));
  const template =
    args.kind === "final_quiz" ? brand.finalQuizMessage : brand.projectMessage;
  return template
    .replace(/\{score\}/gi, score)
    .replace(/\{project\}/gi, args.projectName)
    .replace(/\{name\}/gi, args.recipientName || "");
}

export function formatCertMonthYear(value: string | Date) {
  return formatMonthYear(value, String(value));
}
