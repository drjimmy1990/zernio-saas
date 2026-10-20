'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import { ProviderPublishingWorkspace } from '../ProviderPublishingWorkspace';

interface SmartPostComposerWizardProps { isOpen: boolean; onClose: () => void; onSuccess?: () => void }
export function SmartPostComposerWizard({ isOpen, onClose, onSuccess }: SmartPostComposerWizardProps) {
  const { dir } = useThemeAndLocale();
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => previous?.focus();
  }, [isOpen]);
  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-3 sm:p-8" onKeyDown={e => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Tab') {
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary') || []).filter(node => node.getClientRects().length > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
  }}><div ref={dialog} role="dialog" aria-modal="true" aria-label={dir === 'rtl' ? 'إنشاء منشور' : 'Create post'} className="relative mx-auto max-w-6xl rounded-2xl bg-[var(--bg-card)] p-5 sm:p-8"><div className="mb-4 flex justify-end"><button onClick={onClose} aria-label={dir === 'rtl' ? 'إغلاق' : 'Close'} className="rounded-lg p-2 text-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--accent-primary)]"><X size={20} /></button></div><ProviderPublishingWorkspace isRTL={dir === 'rtl'} onPublished={onSuccess} /></div></div>;
}
