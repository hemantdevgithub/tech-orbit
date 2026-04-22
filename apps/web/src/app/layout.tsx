import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Techorbit',
  description: 'US IT Staffing Marketplace',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-cream-100">
        {children}
      </body>
    </html>
  );
}