'use client';

import { X } from 'lucide-react';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import { WhatsAppNumberOnboarding } from '../WhatsAppNumberOnboarding';

interface BuyNumberWhatsAppWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BuyNumberWhatsAppWizard({ isOpen, onClose, onSuccess }: BuyNumberWhatsAppWizardProps) {
  const { locale, dir } = useThemeAndLocale();
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir={dir}>
      <div role="dialog" aria-modal="true" aria-labelledby="number-setup-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-[var(--bg-card)] p-6 text-[var(--text-primary)]">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id="number-setup-title" className="text-lg font-bold">{locale === 'ar' ? 'شراء رقم وربط واتساب' : 'Purchase a number and connect WhatsApp'}</h2>
          <button onClick={onClose} aria-label={locale === 'ar' ? 'إغلاق' : 'Close'} className="rounded-lg p-2"><X className="h-5 w-5" /></button>
        </div>
        <WhatsAppNumberOnboarding onNumbersUpdated={onSuccess} />
      </div>
    </div>
  );
}
