import type { Metadata } from 'next';
import { Bebas_Neue, DM_Sans } from 'next/font/google';
import Nav from '@/components/Nav';
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
  description: 'Stel je Belgische Pro League droomelf samen en simuleer een volledig seizoen',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${bebasNeue.variable} ${dmSans.variable}`}>
      <body>
        <Nav />
        <div className="page-root">{children}</div>
      </body>
    </html>
  );
}
