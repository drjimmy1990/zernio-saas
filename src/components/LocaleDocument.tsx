'use client';

import type { ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { ThemeAndLocaleProvider } from '@/i18n/ThemeAndLocaleProvider';
import { Navbar } from '@/components/Navbar';

// Params resolve during prerendering. Server-rendered children stay on the server.
export function LocaleDocument({ children, head }: { children: ReactNode; head: ReactNode }) {
  const params = useParams<{ locale?: string }>();
  const routeLocale = params.locale === 'en' || params.locale === 'ar' ? params.locale : undefined;
  const locale = routeLocale ?? 'ar';
  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('asra3_theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=t;}catch(e){}})()`,
          }}
        />
        {head}
      </head>
      <body className="min-h-screen antialiased selection:bg-[var(--brand-coral)] selection:text-white">
        <ThemeAndLocaleProvider fixedLocale={routeLocale}>
          <Navbar />
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </ThemeAndLocaleProvider>
      </body>
    </html>
  );
}
