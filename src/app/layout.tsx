import type { Metadata } from 'next';
import './globals.css';
import { ThemeAndLocaleProvider } from '@/i18n/ThemeAndLocaleProvider';
import { Navbar } from '@/components/Navbar';
import { SeoJsonLd } from '@/components/SeoJsonLd';

export const metadata: Metadata = {
  metadataBase: new URL('https://techurity.si'),
  title: {
    default:
      'Techurity (techurity.si) — منصة التسويق والاتصالات السحابية الموحدة، الأرقام الافتراضية، واتساب للأعمال والذكاء الصوتي',
    template: '%s | Techurity (techurity.si)',
  },
  description:
    'Techurity (techurity.si) unifies 18 social & messaging channels, virtual phone numbers in 55+ countries, WhatsApp Business Cloud API, AI Voice Agents, 2-way SMS, and 8 paid ad networks in one platform and developer API.',
  keywords: [
    'Techurity',
    'techurity.si',
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
    canonical: 'https://techurity.si',
    languages: {
      ar: 'https://techurity.si?lang=ar',
      en: 'https://techurity.si?lang=en',
      es: 'https://techurity.si?lang=es',
      fr: 'https://techurity.si?lang=fr',
      de: 'https://techurity.si?lang=de',
      'pt-BR': 'https://techurity.si?lang=pt-BR',
      tr: 'https://techurity.si?lang=tr',
      ru: 'https://techurity.si?lang=ru',
      zh: 'https://techurity.si?lang=zh',
      ja: 'https://techurity.si?lang=ja',
      'x-default': 'https://techurity.si',
    },
  },
  openGraph: {
    type: 'website',
    url: 'https://techurity.si',
    siteName: 'Techurity',
    title:
      'Techurity (techurity.si) — Unified Social, Virtual Numbers, WhatsApp Business, AI Voice & Ads Platform',
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
    title: 'Techurity (techurity.si) — Unified Omnichannel & Cloud Telephony Platform',
    description:
      '18 social/messaging channels, virtual phone numbers in 55+ countries, WhatsApp Business linking, AI voice agents, and 8 paid ad networks.',
  },
  robots: {
    index: true,
    follow: true,
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

