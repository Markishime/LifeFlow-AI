import type { Metadata } from 'next';
import './globals.css';
import StarField from '../components/cinematic/starfield';

export const metadata: Metadata = {
  title: 'LifeFlow AI - Automation Operations Console',
  description: 'Onboarding and cinematic operations console for LifeFlow AI',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-[#050510] text-white antialiased relative overflow-x-hidden">
        <StarField />
        <div className="relative z-10 min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
