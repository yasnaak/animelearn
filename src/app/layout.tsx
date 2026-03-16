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
  title: 'AnimeForge — Turn Ideas into Anime Series',
  description:
    'Turn any idea into a full anime series with AI — characters, voices, music, and cinematic quality. Ready for YouTube in minutes.',
  openGraph: {
    title: 'AnimeForge — Turn Ideas into Anime Series',
    description:
      'Turn any idea into a full anime series with AI — characters, voices, music, and cinematic quality. Ready for YouTube in minutes.',
    siteName: 'AnimeForge',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AnimeForge — Turn Ideas into Anime Series',
    description:
      'Turn any idea into a full anime series with AI — characters, voices, music, and cinematic quality. Ready for YouTube in minutes.',
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
