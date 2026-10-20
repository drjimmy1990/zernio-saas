import type { ReactNode } from 'react';
import { PRIVATE_METADATA } from '@/lib/seo/site';

export const metadata = PRIVATE_METADATA;

export default function PrivateLayout({ children }: { children: ReactNode }) {
  return children;
}
