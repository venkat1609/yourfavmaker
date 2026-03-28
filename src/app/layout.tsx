import type { Metadata } from 'next';
import Header from '@/components/Header';
import AppFooter from '@/components/AppFooter';
import { Providers } from '@/components/providers';
import '@/index.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'YourFavMaker',
  description: 'Curated commerce for modern brands.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <AppFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
