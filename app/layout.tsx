import type { Metadata } from 'next';
import { Bebas_Neue, DM_Sans } from 'next/font/google';
import './globals.css';

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Pintjesliga',
  description: 'Stel je historische Belgische Pro League droomploeg samen',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${bebasNeue.variable} ${dmSans.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
