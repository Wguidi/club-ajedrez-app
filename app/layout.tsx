import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Club de Ajedrez',
  description: 'Padrón oficial de socios y ranking ELO',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
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