import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Buddy AI",
  description: "Buddy AI - Plataforma de Inteligencia Artificial",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
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
