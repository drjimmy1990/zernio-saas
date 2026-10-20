import type { ReactNode } from 'react';
import { publicMetadata } from '@/lib/seo/site';

export const metadata = publicMetadata('الوثائق وإتاحة الخدمات', 'وثائق Asra3 وحدود الخدمات المتاحة لإدارة العملاء والمحادثات والنشر والحملات. راجع حالة الإتاحة قبل استخدام أي مورد.', '/docs', 'ar');

export default function DocsLayout({ children }: { children: ReactNode }) {
  return children;
}
