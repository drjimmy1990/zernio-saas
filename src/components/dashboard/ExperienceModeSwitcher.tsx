'use client';

import React from 'react';
import { Sparkles, Sliders } from 'lucide-react';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import { getLocalizedText } from '@/i18n/dictionaries';
import { useDashboardMode, type DashboardMode } from '@/lib/hooks/useDashboardMode';

interface ExperienceModeSwitcherProps {
  compact?: boolean;
  className?: string;
  onModeChange?: (mode: DashboardMode) => void;
}

export function ExperienceModeSwitcher({
  compact = false,
  className = '',
  onModeChange,
}: ExperienceModeSwitcherProps) {
  const { locale } = useThemeAndLocale();
  const { mode, setMode } = useDashboardMode();

  const loc = (ar: string, en: string) => getLocalizedText(locale, { ar, en });

  const handleSelect = (newMode: DashboardMode) => {
    if (newMode !== mode) {
      setMode(newMode);
      onModeChange?.(newMode);
    }
  };

  return (
    <div
      role="group"
      aria-label={loc('نمط تجربة لوحة التحكم', 'Dashboard Experience Mode')}
      className={`inline-flex items-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-1 shadow-2xs backdrop-blur-md transition-colors ${className}`}
    >
      {/* Simple Mode Button */}
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'simple'}
        onClick={() => handleSelect('simple')}
        title={loc(
          'وضع مبسط: معالجات سريعة بنقرة واحدة بدون تعقيدات',
          'Simple Mode: 1-click guided wizards and streamlined controls'
        )}
        className={`group relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer ${
          mode === 'simple'
            ? 'bg-[var(--accent-primary)] text-white shadow-sm'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`}
      >
        <Sparkles
          className={`h-3.5 w-3.5 transition-transform duration-200 ${
            mode === 'simple' ? 'scale-110 text-white' : 'text-amber-500 group-hover:scale-105'
          }`}
        />
        <span className={compact ? 'hidden sm:inline' : 'inline'}>
          {loc('وضع مبسط', 'Simple Mode')}
        </span>
      </button>

      {/* Advanced Pro Mode Button */}
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'advanced'}
        onClick={() => handleSelect('advanced')}
        title={loc(
          'الوضع الاحترافي: تحكم كامل في كافة إمكانات المنصة والـ API',
          'Advanced Pro Mode: Full 5-hub navigation, raw API controls & workflows'
        )}
        className={`group relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer ${
          mode === 'advanced'
            ? 'bg-[var(--accent-primary)] text-white shadow-sm'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`}
      >
        <Sliders
          className={`h-3.5 w-3.5 transition-transform duration-200 ${
            mode === 'advanced' ? 'scale-110 text-white' : 'text-[var(--accent-primary)] group-hover:scale-105'
          }`}
        />
        <span className={compact ? 'hidden sm:inline' : 'inline'}>
          {loc('الوضع الاحترافي', 'Advanced Pro')}
        </span>
      </button>
    </div>
  );
}
