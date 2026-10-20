import type { MetadataRoute } from 'next';
import { SITE_URL, PUBLIC_LOCALES, PUBLIC_TOPICS, guidePath, guideAlternates } from '@/lib/seo/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/` },
    { url: `${SITE_URL}/docs` },
    ...PUBLIC_LOCALES.flatMap((locale) => PUBLIC_TOPICS.map((topic) => ({
      url: `${SITE_URL}${guidePath(locale, topic)}`,
      alternates: { languages: guideAlternates(topic) },
    }))),
  ];
}
