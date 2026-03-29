import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Scrap to Scale — Nex-Cell | Mirai School of Technology",
  description:
    "An entrepreneurship hackathon where teams transform scrap into scalable product ideas. Organized by Nex-Cell at Mirai School of Technology.",
  keywords: ["hackathon", "entrepreneurship", "startup", "nex-cell", "mirai"],
  openGraph: {
    title: "Scrap to Scale",
    description: "Transform scrap into scale.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="scan-overlay">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "rgba(10, 14, 26, 0.95)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(0, 245, 255, 0.15)",
              color: "#e2e8f0",
              fontFamily: "'DM Sans', sans-serif",
            },
            classNames: {
              success: "!border-[rgba(57,255,20,0.3)]",
              error: "!border-[rgba(239,68,68,0.3)]",
            },
          }}
          richColors
        />
      </body>
    </html>
  );
}
