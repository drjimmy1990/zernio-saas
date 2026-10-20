import LuxuryLandingPage from '@/components/landing/LuxuryLandingPage';
import { SeoJsonLd } from '@/components/SeoJsonLd';
import { publicMetadata } from '@/lib/seo/site';

export const metadata = publicMetadata(
  'إدارة العملاء وواتساب وفيسبوك وإنستجرام',
  'نظّم بيانات العملاء، واربط حسابات الأعمال، وتابع الرسائل والنشر وحملات واتساب والتقارير من مساحة عمل Asra3. الأتمتة والدفع قريباً.',
  '/', 'ar',
);

export default function HomePage() {
  return <><SeoJsonLd /><LuxuryLandingPage /></>;
}
