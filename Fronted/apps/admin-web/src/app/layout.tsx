import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Buddy - Admin',
  description: 'Plataforma web de administración, supervisión y monitoreo de Buddy',
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
