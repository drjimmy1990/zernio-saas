import type { Metadata } from 'next';

// The public production identity is independent of local/staging runtime URLs.
export const SITE_URL = 'https://asra3.com';
export const PUBLIC_LOCALES = ['ar', 'en'] as const;
export type PublicLocale = (typeof PUBLIC_LOCALES)[number];
export const PUBLIC_TOPICS = ['', 'crm', 'whatsapp', 'facebook-instagram', 'reports'] as const;
export type PublicTopic = (typeof PUBLIC_TOPICS)[number];

export function guidePath(locale: PublicLocale, topic: PublicTopic = '') {
  return `/${locale}${topic ? `/${topic}` : ''}`;
}

export function guideAlternates(topic: PublicTopic) {
  return {
    ar: `${SITE_URL}${guidePath('ar', topic)}`,
    en: `${SITE_URL}${guidePath('en', topic)}`,
    'x-default': `${SITE_URL}${guidePath('en', topic)}`,
  };
}

export function publicMetadata(title: string, description: string, path: string, locale: PublicLocale, topic?: PublicTopic): Metadata {
  const url = `${SITE_URL}${path}`;
  return {
    title: { absolute: `${title} | Asra3` },
    description,
    alternates: { canonical: url, ...(topic !== undefined ? { languages: guideAlternates(topic) } : {}) },
    openGraph: {
      type: 'website', siteName: 'Asra3', title, description, url,
      locale: locale === 'ar' ? 'ar_EG' : 'en_US',
      ...(topic !== undefined ? { alternateLocale: [locale === 'ar' ? 'en_US' : 'ar_EG'] } : {}),
    },
    twitter: { card: 'summary', title, description },
    robots: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  };
}

export const PRIVATE_METADATA: Metadata = {
  robots: { index: false, follow: false },
  alternates: { canonical: null, languages: {} },
};
