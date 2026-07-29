import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BeeApp AI",
  description: "BeeApp AI - Plataforma de Inteligencia Artificial",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
