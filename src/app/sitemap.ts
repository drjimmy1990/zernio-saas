import type { MetadataRoute } from 'next';

const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://social.ai4eg.com').replace(/\/$/, '');

const LANGUAGE_ALTERNATES = {
  ar: `${BASE_URL}?lang=ar`,
  en: `${BASE_URL}?lang=en`,
  es: `${BASE_URL}?lang=es`,
  fr: `${BASE_URL}?lang=fr`,
  de: `${BASE_URL}?lang=de`,
  'pt-BR': `${BASE_URL}?lang=pt-BR`,
  tr: `${BASE_URL}?lang=tr`,
  ru: `${BASE_URL}?lang=ru`,
  zh: `${BASE_URL}?lang=zh`,
  ja: `${BASE_URL}?lang=ja`,
};

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: `${BASE_URL}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
      alternates: {
        languages: LANGUAGE_ALTERNATES,
      },
    },
    {
      url: `${BASE_URL}/docs`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    {
      url: `${BASE_URL}/signup`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/dashboard`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    },
  ];
}
