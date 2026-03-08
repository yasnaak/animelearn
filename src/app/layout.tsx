import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { TRPCProvider } from '@/lib/trpc/provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AnimeLearn — Transform Content into Anime Episodes',
  description:
    'Transform any educational content into engaging motion comic anime episodes powered by AI.',
  openGraph: {
    title: 'AnimeLearn — Transform Content into Anime Episodes',
    description:
      'Transform any educational content into engaging motion comic anime episodes powered by AI.',
    siteName: 'AnimeLearn',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AnimeLearn — Transform Content into Anime Episodes',
    description:
      'Transform any educational content into engaging motion comic anime episodes powered by AI.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TRPCProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </TRPCProvider>
        <Toaster />
      </body>
    </html>
  );
}
