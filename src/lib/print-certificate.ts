import type { CertificateData } from "@/components/certifications/CertificateDocument";
import { COMPANY_ORG_NAME } from "@/lib/onboarding-org";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

function buildCertificateHtml(data: CertificateData) {
  const score = Math.round(data.score);
  const dateStr = formatDate(data.certifiedAt);
  const category = data.categoryName
    ? `<p style="margin:4px 0 0;color:#8a7350;font-size:14px;">${escapeHtml(data.categoryName)}</p>`
    : "";
  const sample = data.isPreview
    ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:5;"><span style="transform:rotate(-12deg);font-size:72px;font-weight:bold;letter-spacing:0.3em;text-transform:uppercase;color:rgba(30,58,95,0.12);">Sample</span></div>`
    : "";

  return `<!DOCTYPE html><html><head><title>Certificate - ${escapeHtml(data.projectName)}</title>
<meta charset="utf-8" />
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #e8e4dc; font-family: Georgia, 'Times New Roman', serif; }
  .sheet { width: 100%; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; }
  .cert { width: 100%; max-width: 900px; background: #faf8f4; color: #1a2332; border: 10px solid #1e3a5f; padding: 36px 48px; position: relative; }
  .inner { border: 1px solid rgba(196,163,90,0.6); padding: 28px 32px; min-height: 480px; display: flex; flex-direction: column; align-items: center; justify-content: space-between; text-align: center; position: relative; }
  h1 { font-size: 36px; color: #1e3a5f; margin: 12px 0; letter-spacing: 0.04em; }
  .name { font-size: 30px; font-weight: bold; margin: 8px 0; }
  .project { font-size: 22px; color: #1e3a5f; font-weight: 600; margin: 8px 0; }
  .muted { color: #5a6570; font-size: 15px; }
  .gold { color: #8a7350; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; }
  .line { width: 120px; height: 1px; background: #c4a35a; margin: 12px auto; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; width: 100%; max-width: 420px; text-align: left; margin-top: 16px; }
  .footer { display: flex; width: 100%; max-width: 520px; align-items: flex-end; justify-content: space-between; gap: 16px; margin-top: 24px; }
  .sig { flex: 1; border-top: 1px solid rgba(26,35,50,0.3); padding-top: 8px; font-size: 12px; }
  .seal { width: 64px; height: 64px; border: 2px solid #c4a35a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; text-transform: uppercase; color: #1e3a5f; letter-spacing: 0.08em; }
  @media print {
    body { background: white; }
    .sheet { padding: 0; min-height: auto; }
    .no-print { display: none !important; }
  }
</style></head><body>
  <div class="no-print" style="position:fixed;top:12px;right:12px;display:flex;gap:8px;z-index:10;">
    <button type="button" id="print-btn" style="padding:8px 14px;background:#1e3a5f;color:#fff;border:0;border-radius:8px;cursor:pointer;font:14px system-ui;">Save as PDF</button>
  </div>
  <div class="sheet"><div class="cert"><div class="inner">
    ${sample}
    <div>
      <p class="gold">${escapeHtml(COMPANY_ORG_NAME)}</p>
      <p style="margin:6px 0 0;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#8a7350;">Training Hub</p>
      <h1>Certificate of Completion</h1>
      <div class="line"></div>
    </div>
    <div>
      <p class="muted">This is to certify that</p>
      <p class="name">${escapeHtml(data.recipientName)}</p>
      <p class="muted">${
        data.kind === "final_quiz"
          ? "has completed the Final Quiz evaluation with the score below for"
          : "has successfully completed training and passed the certification assessment for"
      }</p>
      <p class="project">${escapeHtml(data.projectName)}</p>
      ${category}
    </div>
    <div class="meta">
      <div><p class="gold">Score</p><p style="margin:4px 0 0;font-weight:600;">${score}%</p></div>
      <div><p class="gold">Date awarded</p><p style="margin:4px 0 0;font-weight:600;">${escapeHtml(dateStr)}</p></div>
    </div>
    <div class="footer">
      <div class="sig" style="text-align:left;"><p class="gold">Authorized</p><p>Training Hub</p></div>
      <div class="seal">Certified</div>
      <div class="sig" style="text-align:right;"><p class="gold">Certificate ID</p><p style="font-family:monospace;">${escapeHtml(data.certificateId.slice(0, 12).toUpperCase())}</p></div>
    </div>
  </div></div></div>
</body></html>`;
}

/**
 * Print / Save-as-PDF via a hidden iframe (no blank popup).
 * In the print dialog, choose "Save as PDF" as the destination.
 */
export function printCertificate(data: CertificateData) {
  const html = buildCertificateHtml(data);
  const existing = document.getElementById("certificate-print-frame");
  if (existing) existing.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "certificate-print-frame";
  iframe.setAttribute("title", "Certificate print");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = win?.document;
  if (!win || !doc) {
    iframe.remove();
    alert("Could not prepare the certificate for printing. Please try again.");
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const triggerPrint = () => {
    try {
      win.focus();
      win.print();
    } catch {
      alert("Could not open the print dialog. Please try again.");
    } finally {
      // Keep iframe briefly so print dialog can finish loading content
      setTimeout(() => {
        iframe.remove();
      }, 60_000);
    }
  };

  const btn = doc.getElementById("print-btn");
  if (btn) {
    btn.addEventListener("click", () => win.print());
  }

  // Wait for layout/fonts before printing
  setTimeout(triggerPrint, 350);
}
