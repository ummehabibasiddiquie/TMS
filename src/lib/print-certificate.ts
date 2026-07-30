import type { CertificateData } from "@/components/certifications/CertificateDocument";
import {
  DEFAULT_CERTIFICATE_BRAND,
  certificateMessage,
  certificateTitle,
  formatCertMonthYear,
  type CertificateBrandSettings,
} from "@/lib/certificate-brand";
import { renderSignatureAsInk } from "@/lib/signature-image";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildCertificateHtml(
  data: CertificateData,
  brand: CertificateBrandSettings = DEFAULT_CERTIFICATE_BRAND,
  signatureInkDataUrl?: string | null
) {
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
  const category = data.categoryName
    ? `<p style="margin:4px 0 0;color:${green};font-size:12px;font-family:Montserrat,sans-serif;">${escapeHtml(data.categoryName)}</p>`
    : "";
  const sample = data.isPreview
    ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:5;"><span style="transform:rotate(-12deg);font-size:72px;font-weight:bold;letter-spacing:0.3em;text-transform:uppercase;color:${navy}1a;font-family:Montserrat,sans-serif;">Sample</span></div>`
    : "";

  const ribbon = (flip: boolean) => `
    <svg style="position:absolute;z-index:0;${flip ? "left:0;bottom:0;transform:rotate(180deg);" : "right:0;top:0;"}" width="220" height="180" viewBox="0 0 220 180" aria-hidden="true">
      <path d="M220 0 H95 C130 35 155 70 170 110 C185 145 200 165 220 180 Z" fill="${navy}"/>
      <path d="M220 0 H130 C150 40 165 75 175 105 C188 140 200 160 220 175 Z" fill="${gold}" opacity="0.95"/>
      <path d="M220 0 H155 C168 45 178 80 185 110 C195 140 205 158 220 170 Z" fill="${navy}"/>
    </svg>`;

  const seal = `
    <svg width="88" height="88" viewBox="0 0 100 100" style="display:block;">
      <defs>
        <radialGradient id="sealGold" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stop-color="#f5e6a8"/>
          <stop offset="45%" stop-color="${gold}"/>
          <stop offset="100%" stop-color="#a67c00"/>
        </radialGradient>
      </defs>
      <polygon fill="url(#sealGold)" points="50,2 56,18 74,8 70,26 90,28 74,40 92,55 72,55 78,74 60,62 55,82 50,66 45,82 40,62 22,74 28,55 8,55 26,40 10,28 30,26 26,8 44,18"/>
      <circle cx="50" cy="48" r="22" fill="${navy}"/>
      <circle cx="50" cy="48" r="18" fill="none" stroke="#f5e6a8" stroke-width="1.5"/>
      <text x="50" y="46" text-anchor="middle" fill="#f5e6a8" font-size="9" font-family="Montserrat,sans-serif" font-weight="700" letter-spacing="0.06em">CERT</text>
      <text x="50" y="58" text-anchor="middle" fill="#f5e6a8" font-size="7" font-family="Montserrat,sans-serif" font-weight="600">IFIED</text>
    </svg>`;

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const absUrl = (path: string | null) => {
    if (!path) return "";
    if (path.startsWith("http") || path.startsWith("data:")) return path;
    return `${origin}${path}`;
  };

  const logoBlock = brand.logoImageUrl
    ? `<img src="${escapeHtml(absUrl(brand.logoImageUrl))}" alt="" style="height:48px;max-width:180px;object-fit:contain;margin-bottom:4px;" />`
    : `<p class="brand" style="color:${navy};">${escapeHtml(brand.brandName)}<span style="color:${green};font-size:10px;vertical-align:super;">▲</span></p>${
        brand.tagline ? `<p class="tag">${escapeHtml(brand.tagline)}</p>` : ""
      }`;

  const signatureBlock = signatureInkDataUrl
    ? `<img class="sig-img" src="${escapeHtml(signatureInkDataUrl)}" alt="" />`
    : brand.signatureImageUrl
      ? `<img class="sig-img" src="${escapeHtml(absUrl(brand.signatureImageUrl))}" alt="" />`
      : `<p class="sig-mark" style="color:${gold};">${escapeHtml(brand.signatoryMark)}</p>`;

  return `<!DOCTYPE html><html><head><title>Certificate - ${escapeHtml(data.recipientName)}</title>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
<style>
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #e5e7eb; font-family: Montserrat, sans-serif; color: ${navy}; }
  .sheet { width: 100%; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 12px; }
  .cert { position: relative; width: 100%; max-width: 980px; aspect-ratio: 1.414 / 1; background: #fff; overflow: hidden; }
  .frame { position: absolute; inset: 18px; border: 1.5px solid ${gold}; pointer-events: none; z-index: 1; }
  .inner { position: relative; z-index: 2; height: 100%; padding: 28px 36px 24px; display: flex; flex-direction: column; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; }
  .brand { font-size: 26px; font-weight: 800; font-style: italic; letter-spacing: -0.02em; margin: 0; }
  .tag { margin: 2px 0 0; font-size: 12px; color: ${green}; font-weight: 500; }
  .center { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 8px 40px; }
  .script-title { font-family: 'Great Vibes', cursive; font-size: 64px; line-height: 1; margin: 0; color: ${navy}; }
  .sub { margin: 6px 0 0; font-size: 13px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: ${green}; }
  .presented { margin: 28px 0 0; font-size: 11px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: ${green}; }
  .name { font-family: 'Great Vibes', cursive; font-size: 48px; line-height: 1.1; margin: 10px 0 0; color: ${navy}; }
  .gold-line { width: 220px; height: 1px; background: ${gold}; margin: 10px auto 0; }
  .msg { margin: 18px 0 0; max-width: 560px; font-size: 13px; line-height: 1.55; color: ${navy}; opacity: 0.92; }
  .project { margin: 14px 0 0; font-size: 16px; font-weight: 600; }
  .score { margin: 6px 0 0; font-size: 12px; color: ${green}; }
  .awarded { margin: 14px 0 0; font-size: 15px; font-weight: 700; color: ${navy}; }
  .cid-center { margin: 4px 0 0; font-family: ui-monospace, monospace; font-size: 9px; color: ${navy}; opacity: 0.45; letter-spacing: 0.04em; }
  .foot { display: flex; justify-content: flex-end; align-items: flex-end; padding: 0 8px 4px; }
  .sig-wrap { min-width: 180px; text-align: center; }
  .sig-img {
    height: 56px;
    max-width: 200px;
    object-fit: contain;
    display: block;
    margin: 0 auto;
    background: transparent;
    border: 0;
    box-shadow: none;
    mix-blend-mode: multiply;
    opacity: 0.92;
  }
  .sig-mark { font-family: 'Great Vibes', cursive; font-size: 32px; margin: 0; line-height: 1; }
  .sig-line { width: 160px; height: 1px; background: ${navy}; margin: 6px auto 0; }
  .sig-name { margin: 6px 0 0; font-size: 13px; font-weight: 700; }
  .sig-title { margin: 2px 0 0; font-size: 11px; color: ${green}; font-weight: 500; }
  @media print {
    body { background: white; }
    .sheet { padding: 0; min-height: auto; }
    .no-print { display: none !important; }
  }
</style></head><body>
  <div class="no-print" style="position:fixed;top:12px;right:12px;z-index:10;">
    <button type="button" id="print-btn" style="padding:8px 14px;background:${navy};color:#fff;border:0;border-radius:8px;cursor:pointer;font:14px Montserrat,system-ui;">Save as PDF</button>
  </div>
  <div class="sheet"><div class="cert">
    ${ribbon(false)}
    ${ribbon(true)}
    <div class="frame"></div>
    <div class="inner">
      ${sample}
      <div class="top">
        <div>
          ${logoBlock}
        </div>
        <div style="margin-right:36px;margin-top:4px;">${seal}</div>
      </div>
      <div class="center">
        <h1 class="script-title">${escapeHtml(title.script)}</h1>
        <p class="sub">${escapeHtml(title.sub)}</p>
        <p class="presented">${escapeHtml(brand.presentedLabel)}</p>
        <p class="name">${escapeHtml(data.recipientName)}</p>
        <div class="gold-line"></div>
        <p class="msg">${escapeHtml(message)}</p>
        <p class="project">${escapeHtml(data.projectName)}</p>
        ${category}
        <p class="score">Score: ${Math.round(data.score)}%</p>
        <p class="awarded">${escapeHtml(monthYear)}</p>
        <p class="cid-center">ID ${escapeHtml(data.certificateId.slice(0, 10).toUpperCase())}</p>
      </div>
      <div class="foot">
        <div class="sig-wrap">
          ${signatureBlock}
          <div class="sig-line"></div>
          <p class="sig-name">${escapeHtml(brand.signatoryName)}</p>
          <p class="sig-title">${escapeHtml(brand.signatoryTitle)}</p>
        </div>
      </div>
    </div>
  </div></div>
</body></html>`;
}

export async function printCertificate(
  data: CertificateData,
  brand: CertificateBrandSettings = DEFAULT_CERTIFICATE_BRAND
) {
  let ink: string | null = null;
  if (brand.signatureImageUrl) {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const src = brand.signatureImageUrl.startsWith("http")
      ? brand.signatureImageUrl
      : `${origin}${brand.signatureImageUrl}`;
    ink = await renderSignatureAsInk(src);
  }

  const html = buildCertificateHtml(data, brand, ink);
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
      setTimeout(() => {
        iframe.remove();
      }, 60_000);
    }
  };

  const btn = doc.getElementById("print-btn");
  if (btn) {
    btn.addEventListener("click", () => win.print());
  }

  setTimeout(triggerPrint, 700);
}
