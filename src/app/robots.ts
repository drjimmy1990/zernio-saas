import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/docs', '/login', '/signup', '/llms.txt'],
        disallow: ['/api/admin'],
      },
      {
        userAgent: [
          'GPTBot',
          'OAI-SearchBot',
          'ChatGPT-User',
          'PerplexityBot',
          'ClaudeBot',
          'anthropic-ai',
          'Google-Extended',
          'Applebot-Extended',
        ],
        allow: ['/', '/docs', '/llms.txt'],
      },
    ],
    sitemap: 'https://techurity.si/sitemap.xml',
    host: 'https://techurity.si',
  };
}
