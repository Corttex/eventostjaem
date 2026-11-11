import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

export const metadata: Metadata = {
  title: 'Seminário Nacional 30 Anos da Arbitragem e Mediação no Brasil | TJAEM & CAMEB',
  description: 'Seminário Nacional em comemoração aos 30 anos da Arbitragem e Mediação no Brasil. 01 de Dezembro de 2026, das 09h às 18h no Versá Restaurante & Eventos, Núcleo Bandeirante, Brasília/DF. Inscreva-se agora.',
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
