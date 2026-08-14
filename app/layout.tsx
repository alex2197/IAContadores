import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cierre Fiscal IA — MVP",
  description: "Copiloto de revisión de cierre fiscal para contadores",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-paper text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
