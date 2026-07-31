"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application error:", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#020617", color: "#f8fafc", padding: 24 }}>
          <section style={{ maxWidth: 440, border: "1px solid #1e293b", borderRadius: 8, padding: 24, background: "#0f172a" }}>
            <p style={{ color: "#fda4af", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700 }}>
              Application error
            </p>
            <h1 style={{ marginTop: 12, fontSize: 24 }}>The app could not render</h1>
            <p style={{ marginTop: 8, color: "#94a3b8", fontSize: 14 }}>
              {error.message || "A critical error occurred. Please refresh the page."}
            </p>
            {error.digest && (
              <p style={{ marginTop: 8, color: "#64748b", fontSize: 12, fontFamily: "monospace" }}>
                Error ID: {error.digest}
              </p>
            )}
            <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
              <button
                type="button"
                onClick={reset}
                style={{ border: 0, borderRadius: 8, background: "#2563eb", color: "white", padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={() => window.location.href = "/"}
                style={{ border: "1px solid #334155", borderRadius: 8, background: "transparent", color: "#cbd5e1", padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}
              >
                Go Home
              </button>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
