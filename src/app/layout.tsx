import type { Metadata } from 'next';
import './globals.css';
import { LocaleDocument } from '@/components/LocaleDocument';
import { SITE_URL } from '@/lib/seo/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Asra3 — إدارة العملاء والمحادثات', template: '%s | Asra3' },
  description: 'Asra3 يجمع إدارة العملاء ومحادثات واتساب وفيسبوك وإنستجرام والنشر والحملات والتقارير في مساحة عمل واحدة.',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }, { url: '/favicon.ico', sizes: '32x32' }],
    shortcut: '/favicon.ico',
    apple: '/icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocaleDocument head={<>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
    </>}>
      {children}
    </LocaleDocument>
  );
}
