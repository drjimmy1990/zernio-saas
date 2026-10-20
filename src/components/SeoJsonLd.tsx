import { SITE_URL } from '@/lib/seo/site';

export function SeoJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: 'Asra3', url: SITE_URL, logo: `${SITE_URL}/logo.svg` },
      { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: 'Asra3', url: SITE_URL,
        publisher: { '@id': `${SITE_URL}/#organization` }, inLanguage: ['ar', 'en'] },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />;
}
