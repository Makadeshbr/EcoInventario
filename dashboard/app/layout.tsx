import type { Metadata } from 'next';

import { Providers } from '@/components/providers';

import './globals.css';
import 'leaflet/dist/leaflet.css';

export const metadata: Metadata = {
  title: 'EcoInventario Dashboard',
  description: 'Dashboard operacional do EcoInventario',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
