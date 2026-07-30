import { formatRole } from "./roles";

export type CertReviewer = { id: string; name: string; role: string };

export type CertActionEvent =
  | "approved"
  | "rejected"
  | "retake_granted"
  | "retake_open"
  | "superseded"
  | "pending";

export function certActionLabel(event: CertActionEvent): string {
  switch (event) {
    case "approved":
      return "Approved by";
    case "rejected":
      return "Rejected by";
    case "retake_granted":
    case "retake_open":
    case "superseded":
      return "Retake allowed by";
    default:
      return "By";
  }
}

export function formatCertActionBy(
  event: CertActionEvent,
  actor: Pick<CertReviewer, "name" | "role"> | null | undefined
): string | null {
  if (!actor?.name) return null;
  return `${certActionLabel(event)} ${actor.name} (${formatRole(actor.role)})`;
}

/** Shown when a legacy retake has no stored grantor (never guess from trainer assignment). */
export function formatCertActionByOrUnknown(
  event: CertActionEvent,
  actor: Pick<CertReviewer, "name" | "role"> | null | undefined
): string | null {
  if (actor?.name) return formatCertActionBy(event, actor);
  if (
    event === "retake_granted" ||
    event === "retake_open" ||
    event === "superseded"
  ) {
    return "Retake allowed (grantor not recorded)";
  }
  if (event === "approved" || event === "rejected") {
    return null;
  }
  return null;
}
