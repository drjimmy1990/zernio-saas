'use client';

import React from 'react';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';

/**
 * AEO (Answer Engine Optimization) & GEO (Generative Engine Optimization)
 * Injects a complete Schema.org `@graph` JSON-LD for `https://techurity.si`:
 * - Organization (`Techurity`)
 * - WebSite + SearchAction
 * - SoftwareApplication (with AggregateOffer $29-$499 and all 8 sub-services)
 * - FAQPage (localized in the active language for Google AI Overviews, Perplexity & ChatGPT)
 */
export function SeoJsonLd() {
  const { locale, t } = useThemeAndLocale();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://techurity.si/#organization',
        name: 'Techurity',
        url: 'https://techurity.si',
        logo: 'https://techurity.si/logo.png',
        description: t.hero.subtitle,
        sameAs: ['https://techurity.si/docs'],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          url: 'https://techurity.si/docs',
          availableLanguage: [
            'ar',
            'en',
            'es',
            'fr',
            'de',
            'pt-BR',
            'tr',
            'ru',
            'zh',
            'ja',
          ],
        },
      },
      {
        '@type': 'WebSite',
        '@id': 'https://techurity.si/#website',
        url: 'https://techurity.si',
        name: 'Techurity — White-Label Multi-Service Cloud OS',
        inLanguage: locale,
        publisher: {
          '@id': 'https://techurity.si/#organization',
        },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': 'https://techurity.si/#software',
        name: 'Techurity Cloud OS',
        url: 'https://techurity.si',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, Cloud, iOS, Android',
        description: t.hero.subtitle,
        offers: {
          '@type': 'AggregateOffer',
          lowPrice: '29.00',
          highPrice: '499.00',
          priceCurrency: 'USD',
          offerCount: 4,
        },
        featureList: [
          'White-Label Headless OAuth across 18 Social & Blog Platforms',
          'Omnichannel Publishing & Smart Queues',
          'Unified DM Inbox, Social CRM & Comment-to-DM Automations',
          'Executive Analytics & Attribution Dashboard',
          '8-Network Paid Ads Management & Server-Side Conversions API (CAPI)',
          'Cloud Telephony, White-Label KYC Links, WebRTC Softphone & AI Voice Agents',
          'Unified Shopify & WooCommerce E-Commerce, Blogs & Google Business Local SEO',
          'White-Label AI Root-Cause Diagnostic Assistant',
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': 'https://techurity.si/#faq',
        inLanguage: locale,
        mainEntity: t.faqSection.items.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.a,
          },
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
