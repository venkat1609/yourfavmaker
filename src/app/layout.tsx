import type { Metadata } from 'next';
import Header from '@/components/Header';
import { Providers } from '@/components/providers';
import '@/index.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'YourFavMaker',
  description: 'Handcrafted commerce built with care.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <footer className="border-t py-8 text-center text-xs text-muted-foreground">
              © {new Date().getFullYear()} YourFavMaker. All rights reserved.
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
