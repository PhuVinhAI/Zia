import type { Metadata } from 'next';
import { Nunito, Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { Header } from '@/components/layout/header';

const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
});

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Zia Dashboard',
  description: 'Bảng điều khiển quản trị Zia Bot',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${nunito.variable} ${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <Providers>
          <SidebarProvider>
            <SidebarNav />
            <main className="flex-1 flex flex-col min-h-screen bg-background">
              <Header />
              <div className="flex-1 p-4 md:p-6 lg:p-8">{children}</div>
            </main>
          </SidebarProvider>
        </Providers>
      </body>
    </html>
  );
}
