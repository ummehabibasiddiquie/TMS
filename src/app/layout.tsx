import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Training Hub - Onboarding Platform",
  description: "Internal onboarding, training, certification, and progress tracking",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
