import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EGCSO Rapport — Maintenance Reporting System",
  description: "Système d'enregistrement et d'indexation des rapports de maintenance technique — EPIC EGCSO, Complexe Sportif d'Oran",
  icons: {
    icon: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="antialiased font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
