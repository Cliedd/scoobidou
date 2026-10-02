import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Passportly — Voyager mieux informé', description: 'Comprendre et préparer ses visas avec des données vérifiées.' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="fr"><body>{children}</body></html>; }
