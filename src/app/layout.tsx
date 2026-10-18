import type { Metadata } from 'next';
import './globals.css';
import { ThemeAndLocaleProvider } from '@/i18n/ThemeAndLocaleProvider';
import { Navbar } from '@/components/Navbar';
import { SeoJsonLd } from '@/components/SeoJsonLd';

export const metadata: Metadata = {
  metadataBase: new URL('https://asra3.com'),
  title: {
    default:
      'Asra3 (asra3.com) — منصة التسويق والاتصالات السحابية الموحدة، الأرقام الافتراضية، واتساب للأعمال والذكاء الصوتي',
    template: '%s | Asra3 (asra3.com)',
  },
  description:
    'Asra3 (asra3.com) unifies 18 social & messaging channels, virtual phone numbers in 55+ countries, WhatsApp Business Cloud API, AI Voice Agents, 2-way SMS, and 8 paid ad networks in one platform and developer API.',
  keywords: [
    'Asra3',
    'asra3.com',
    'Omnichannel Social Media API',
    'Virtual Phone Numbers WhatsApp Business',
    'AI Voice Agents Telephony',
    'Unified Social Inbox',
    'شراء رقم افتراضي للواتساب',
    'ربط حسابات التواصل الاجتماعي',
    'منصة تسويق واتصالات سحابية',
    'إدارة حسابات التواصل والإعلانات',
  ],
  alternates: {
    canonical: 'https://asra3.com',
    languages: {
      ar: 'https://asra3.com?lang=ar',
      en: 'https://asra3.com?lang=en',
      es: 'https://asra3.com?lang=es',
      fr: 'https://asra3.com?lang=fr',
      de: 'https://asra3.com?lang=de',
      'pt-BR': 'https://asra3.com?lang=pt-BR',
      tr: 'https://asra3.com?lang=tr',
      ru: 'https://asra3.com?lang=ru',
      zh: 'https://asra3.com?lang=zh',
      ja: 'https://asra3.com?lang=ja',
      'x-default': 'https://asra3.com',
    },
  },
  openGraph: {
    type: 'website',
    url: 'https://asra3.com',
    siteName: 'Asra3',
    title:
      'Asra3 (asra3.com) — Unified Social, Virtual Numbers, WhatsApp Business, AI Voice & Ads Platform',
    description:
      'Connect 18 social channels, buy virtual numbers in 55+ countries, link WhatsApp Business & AI Voice Agents, and run 8-network ads from one dashboard or REST API.',
    locale: 'ar_SA',
    alternateLocale: [
      'en_US',
      'es_ES',
      'fr_FR',
      'de_DE',
      'pt_BR',
      'tr_TR',
      'ru_RU',
      'zh_CN',
      'ja_JP',
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Asra3 (asra3.com) — Unified Omnichannel & Cloud Telephony Platform',
    description:
      '18 social/messaging channels, virtual phone numbers in 55+ countries, WhatsApp Business linking, AI voice agents, and 8 paid ad networks.',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    shortcut: '/favicon.ico',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ar"
      dir="rtl"
      data-theme="light"
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased selection:bg-[var(--brand-coral)] selection:text-white">
        <ThemeAndLocaleProvider>
          <SeoJsonLd />
          <Navbar />
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </ThemeAndLocaleProvider>
      </body>
    </html>
  );
}

