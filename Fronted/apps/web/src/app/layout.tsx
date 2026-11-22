import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import {
  AUTH_HINT_COOKIE_NAME,
  parseAuthHintCookie,
} from "@/lib/auth/sessionHint";

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
  const cookieStore = cookies();
  const initialProfile = parseAuthHintCookie(
    cookieStore.get(AUTH_HINT_COOKIE_NAME)?.value,
  );

  return (
    <html lang="es">
      <body className="antialiased">
        <AuthProvider initialProfile={initialProfile}>{children}</AuthProvider>
      </body>
    </html>
  );
}
