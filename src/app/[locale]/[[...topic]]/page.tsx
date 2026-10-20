import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SeoJsonLd } from '@/components/SeoJsonLd';
import { GUIDES } from '@/lib/seo/guides';
import { SITE_URL, PUBLIC_LOCALES, PUBLIC_TOPICS, guidePath, publicMetadata, type PublicLocale, type PublicTopic } from '@/lib/seo/site';

type Props = { params: Promise<{ locale: string; topic?: string[] }> };
export const dynamicParams = false;

export function generateStaticParams() {
  return PUBLIC_LOCALES.flatMap((locale) => PUBLIC_TOPICS.map((topic) => ({ locale, topic: topic ? [topic] : [] })));
}

async function resolveGuide(params: Props['params']) {
  const route = await params;
  const topic = route.topic?.join('/') ?? '';
  if (!PUBLIC_LOCALES.includes(route.locale as PublicLocale) || !PUBLIC_TOPICS.includes(topic as PublicTopic)) notFound();
  const locale = route.locale as PublicLocale;
  return { locale, topic: topic as PublicTopic, guide: GUIDES[locale][topic as PublicTopic] };
}

export async function generateMetadata({ params }: Props) {
  const { locale, topic, guide } = await resolveGuide(params);
  return publicMetadata(guide.title, guide.description, guidePath(locale, topic), locale, topic);
}

export default async function ProductGuidePage({ params }: Props) {
  const { locale, topic, guide } = await resolveGuide(params);
  const ar = locale === 'ar';
  const otherLocale = ar ? 'en' : 'ar';
  const url = `${SITE_URL}${guidePath(locale, topic)}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage', '@id': `${url}#page`, url, name: guide.title,
    description: guide.description, inLanguage: locale,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@type': 'SoftwareApplication', name: 'Asra3', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', url: SITE_URL },
  };
  return (
    <article lang={locale} dir={ar ? 'rtl' : 'ltr'} className="pb-12 text-[var(--text-primary)]">
      <SeoJsonLd />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-subtle)] py-5 text-sm">
        <nav aria-label={ar ? 'مسار التصفح' : 'Breadcrumb'} className="flex flex-wrap items-center gap-3">
          <Link href="/" className="underline underline-offset-4">Asra3</Link>
          <span aria-hidden="true">/</span>
          <Link href={guidePath(locale)} className="underline underline-offset-4">{ar ? 'دليل المنتج' : 'Product guide'}</Link>
          {topic && <><span aria-hidden="true">/</span><span>{guide.label}</span></>}
        </nav>
        <Link href={guidePath(otherLocale, topic)} hrefLang={otherLocale} lang={otherLocale} className="font-semibold underline underline-offset-4">
          {ar ? 'Read in English' : 'اقرأ بالعربية'}
        </Link>
      </div>

      <header className="max-w-4xl py-12 sm:py-20">
        <p className="mb-5 text-sm font-bold text-[var(--brand-coral)]">{ar ? 'ASRA3 / دليل الأعمال' : 'ASRA3 / BUSINESS GUIDE'}</p>
        <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">{guide.title}</h1>
        <p className="mt-7 max-w-3xl text-lg leading-relaxed text-[var(--text-secondary)]">{guide.intro}</p>
        <Link href="/signup" className="mt-8 inline-flex rounded-xl bg-[var(--brand-coral)] px-6 py-3 text-sm font-bold text-white hover:bg-[var(--accent-hover)]">
          {ar ? 'إنشاء حساب' : 'Create an account'}
        </Link>
      </header>

      <div className="grid items-start gap-10 border-t border-[var(--border-subtle)] pt-8 lg:grid-cols-[15rem_1fr] lg:gap-20">
        <aside className="lg:sticky lg:top-24">
          <h2 className="mb-3 text-sm font-bold">{ar ? 'استكشف المنتج' : 'Explore the product'}</h2>
          <nav aria-label={ar ? 'أدلة المنتج' : 'Product guides'} className="flex flex-wrap gap-2 lg:flex-col lg:items-start">
            {PUBLIC_TOPICS.map((item) => <Link key={item} href={guidePath(locale, item)} aria-current={item === topic ? 'page' : undefined}
              className={`rounded-lg px-3 py-2 text-sm transition ${item === topic ? 'bg-[var(--brand-coral-soft)] font-bold text-[var(--brand-coral)]' : 'text-[var(--text-secondary)] hover:underline'}`}>
              {GUIDES[locale][item].label}
            </Link>)}
          </nav>
        </aside>
        <div className="min-w-0 max-w-3xl">
          {guide.sections.map((section, index) => <section key={section.title} className="mb-10 border-b border-[var(--border-subtle)] pb-10">
            <p aria-hidden="true" className="mb-3 text-sm font-bold text-[var(--brand-coral)]">{String(index + 1).padStart(2, '0')}</p>
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl">{section.title}</h2>
            <p className="text-base leading-loose text-[var(--text-secondary)]">{section.body}</p>
            {section.points && <ul className="mt-5 list-disc space-y-2 ps-5 text-[var(--text-secondary)]">{section.points.map((point) => <li key={point}>{point}</li>)}</ul>}
          </section>)}
          <section aria-labelledby="guide-questions">
            <h2 id="guide-questions" className="mb-7 text-2xl font-bold">{ar ? 'أسئلة شائعة' : 'Common questions'}</h2>
            {guide.questions.map((item) => <div key={item.question} className="mb-7">
              <h3 className="mb-2 text-lg font-semibold">{item.question}</h3>
              <p className="leading-loose text-[var(--text-secondary)]">{item.answer}</p>
            </div>)}
          </section>
          <footer className="mt-12 flex flex-wrap gap-5 border-t border-[var(--border-subtle)] pt-6 text-sm">
            <Link href="/docs" className="underline underline-offset-4">{ar ? 'الوثائق وإتاحة الخدمات' : 'Documentation and availability'}</Link>
            <Link href={guidePath(otherLocale, topic)} hrefLang={otherLocale} lang={otherLocale} className="underline underline-offset-4">{ar ? 'English version' : 'النسخة العربية'}</Link>
          </footer>
        </div>
      </div>
    </article>
  );
}
