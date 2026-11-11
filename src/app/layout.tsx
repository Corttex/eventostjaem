import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

export const metadata: Metadata = {
  metadataBase: new URL('https://eventos.tjaembrasil.com.br'),
  title: 'Seminário Nacional 30 Anos da Arbitragem e Mediação no Brasil | TJAEM & CAMEB',
  description: 'Comemoração dos 30 Anos da Lei de Arbitragem. 01 de Dezembro de 2026, 09h às 18h no Versá Restaurante & Eventos, Núcleo Bandeirante - Brasília/DF. Garanta sua credencial oficial.',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://eventos.tjaembrasil.com.br',
    siteName: 'TJAEM & CAMEB Brasil - Eventos',
    title: 'Seminário Nacional 30 Anos da Arbitragem e Mediação no Brasil',
    description: 'Comemoração dos 30 Anos da Lei de Arbitragem. 01/12/2026 das 09h às 18h no Versá Eventos, Brasília/DF. Garanta sua vaga com credencial solene.',
    images: [
      {
        url: '/versa-1.jpg',
        width: 1200,
        height: 630,
        alt: 'Seminário Nacional 30 Anos da Arbitragem e Mediação no Brasil - TJAEM & CAMEB',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Seminário Nacional 30 Anos da Arbitragem e Mediação no Brasil | TJAEM',
    description: 'Comemoração solene dos 30 Anos da Lei de Arbitragem no Versá Restaurante & Eventos, Brasília/DF. 01 de Dezembro de 2026.',
    images: ['/versa-1.jpg'],
  },
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${playfair.variable}`}>
        {children}
      </body>
    </html>
  );
}
