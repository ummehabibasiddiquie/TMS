"use client";

import { useEffect, useState } from "react";
import { renderSignatureAsInk } from "@/lib/signature-image";

/**
 * Draws a signature like pen ink on the certificate paper —
 * not a rectangular photo sticker.
 */
export function CertificateSignature({
  src,
  fallbackMark,
  goldColor,
  compact,
}: {
  src: string | null | undefined;
  fallbackMark: string;
  goldColor: string;
  compact?: boolean;
}) {
  const [inkSrc, setInkSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!src) {
      setInkSrc(null);
      return;
    }
    let cancelled = false;
    setFailed(false);
    void (async () => {
      const out = await renderSignatureAsInk(src);
      if (cancelled) return;
      if (out) setInkSrc(out);
      else setFailed(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!src || failed) {
    return (
      <p
        className={`leading-none ${compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"}`}
        style={{ fontFamily: "'Great Vibes', cursive", color: goldColor }}
      >
        {fallbackMark}
      </p>
    );
  }

  if (!inkSrc) {
    return (
      <p
        className="text-[10px] text-slate-400"
        style={{ minHeight: compact ? 40 : 48 }}
      >
        …
      </p>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={inkSrc}
      alt=""
      className={`mx-auto object-contain ${
        compact ? "h-11 max-w-[190px] sm:h-12" : "h-12 max-w-[210px] sm:h-14"
      }`}
      style={{
        background: "transparent",
        border: "none",
        outline: "none",
        boxShadow: "none",
        // Ink soaks into white paper instead of sitting as a sticker
        mixBlendMode: "multiply",
        opacity: 0.92,
        display: "block",
      }}
    />
  );
}
