import type { ReactNode } from 'react';
import { PRIVATE_METADATA } from '@/lib/seo/site';

export const metadata = PRIVATE_METADATA;
export const dynamic = 'force-dynamic';

export default function PrivateLayout({ children }: { children: ReactNode }) {
  return children;
}
