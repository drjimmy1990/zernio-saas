'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LOCALE_META, type SupportedLocale } from '@/i18n/dictionaries';
import { getLandingCopy } from '@/i18n/landingTranslations';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import type { AuthSession } from '@/lib/auth/session';
import { ExperienceModeSwitcher } from '@/components/dashboard/ExperienceModeSwitcher';
import { Asra3Logo } from '@/components/Asra3Logo';
import {
  ShieldCheck,
  LayoutDashboard,
  BookOpen,
  Sun,
  Moon,
  Globe,
  LogOut,
  User,
  ChevronDown,
  Check,
  Menu,
  X,
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, setLocale, theme, toggleTheme, t } = useThemeAndLocale();
  const landingCopy = getLandingCopy(locale);

  const [session, setSession] = useState<AuthSession | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth?action=session', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.session) {
          setSession(data.session);
          return;
        }
      }
      setSession(null);
    } catch {
      setSession(null);
    }
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession, pathname]);

  // Close language dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        langMenuRef.current &&
        !langMenuRef.current.contains(event.target as Node)
      ) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
      setSession(null);
      router.push('/login');
    } catch {
      window.location.href = '/login';
    }
  };

  const currentLocaleMeta =
    LOCALE_META.find((l) => l.code === locale) || LOCALE_META[0];

  // Unified, non-redundant navigation items
  const primaryLinks = [
    { href: '/', label: t.nav.home, exact: true },
    { href: '/#platforms', label: landingCopy.navAnchors.platforms },
    { href: '/#telephony', label: landingCopy.navAnchors.telephony },
    { href: '/#ads', label: landingCopy.navAnchors.ads },
    { href: '/#pricing', label: landingCopy.navAnchors.pricing },
    { href: '/docs', label: t.nav.docs, icon: BookOpen, exact: true },
    ...(session
      ? [
          {
            href: '/dashboard',
            label: t.nav.workspace,
            icon: LayoutDashboard,
            exact: true,
          },
        ]
      : []),
    ...(session?.user.role === 'super_admin'
      ? [
          {
            href: '/admin',
            label: t.nav.admin,
            icon: ShieldCheck,
            exact: true,
            isAdmin: true,
          },
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--bg-header)] backdrop-blur-xl transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-[68px] sm:px-6 lg:px-8">
        {/* 1. Brand Identity: Bespoke Asra3 Emblem & Stylized Wordmark */}
        <Link
          href="/"
          className="group flex shrink-0 items-center cursor-pointer"
        >
          <Asra3Logo size="sm" showDomainBadge />
        </Link>

        {/* 2. Center Unified Navigation Pill Bar (Desktop) */}
        <nav
          aria-label="Main Navigation"
          className="hidden lg:flex items-center gap-0.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/75 p-1 backdrop-blur-md shadow-2xs"
        >
          {primaryLinks.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact ? pathname === item.href : false;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-[var(--brand-coral)] text-white shadow-xs'
                    : item.isAdmin
                    ? 'border border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'
                }`}
              >
                {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* 3. End Action Controls: Always Single-Line & Aligned */}
        <div className="flex shrink-0 items-center gap-2">
          {pathname === '/dashboard' && (
            <ExperienceModeSwitcher compact className="hidden xl:inline-flex" />
          )}

          {/* Custom 10-Language Popover Switcher (Clean ISO badges, no broken Windows flag text) */}
          <div className="relative" ref={langMenuRef}>
            <button
              type="button"
              onClick={() => setLangOpen((prev) => !prev)}
              aria-label="Select Language"
              aria-expanded={langOpen}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-2.5 text-xs font-bold text-[var(--text-primary)] transition hover:border-[var(--brand-coral)]/40 cursor-pointer shadow-2xs"
            >
              <Globe className="h-3.5 w-3.5 text-[var(--brand-coral)] shrink-0" />
              <span className="hidden sm:inline">{currentLocaleMeta.nativeName}</span>
              <span
                dir="ltr"
                className="rounded-md bg-[var(--brand-coral-soft)] px-1.5 py-0.5 font-mono text-[10px] font-extrabold uppercase text-[var(--brand-coral)]"
              >
                {currentLocaleMeta.code.split('-')[0]}
              </span>
              <ChevronDown
                className={`h-3 w-3 text-[var(--text-muted)] transition-transform ${
                  langOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {langOpen && (
              <div className="absolute end-0 mt-2 w-60 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-1.5 shadow-2xl z-50 grid grid-cols-2 gap-1">
                {LOCALE_META.map((loc) => {
                  const isSelected = loc.code === locale;
                  const shortCode = loc.code.split('-')[0].toUpperCase();
                  return (
                    <button
                      key={loc.code}
                      type="button"
                      onClick={() => {
                        setLocale(loc.code as SupportedLocale);
                        setLangOpen(false);
                      }}
                      className={`flex items-center justify-between gap-1.5 rounded-xl px-2.5 py-2 text-start text-xs font-bold transition cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--brand-coral)] text-white'
                          : 'text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          dir="ltr"
                          className={`shrink-0 rounded px-1 py-0.5 font-mono text-[9px] font-extrabold ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-[var(--bg-subtle)] text-[var(--brand-coral)]'
                          }`}
                        >
                          {shortCode}
                        </span>
                        <span className="truncate">{loc.nativeName}</span>
                      </div>
                      {isSelected && <Check className="h-3 w-3 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Theme Toggle (Executive Light / Velvet Dark) */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? t.nav.darkMode : t.nav.lightMode}
            title={theme === 'light' ? t.nav.darkMode : t.nav.lightMode}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] transition hover:border-[var(--brand-coral)]/40 cursor-pointer shadow-2xs"
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4 text-slate-700" />
            ) : (
              <Sun className="h-4 w-4 text-amber-400" />
            )}
          </button>

          {/* Dynamic Auth State Controls */}
          {session ? (
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="hidden sm:flex h-9 items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-2.5 text-xs transition hover:border-[var(--brand-coral)]/40"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-coral)]/15 text-[var(--brand-coral)]">
                  <User className="h-3 w-3" />
                </div>
                <span className="max-w-[110px] truncate font-bold text-[var(--text-primary)] text-[11px]">
                  {session.user.fullName || session.user.email}
                </span>
                {session.user.role === 'super_admin' && (
                  <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-bold text-amber-600">
                    Admin
                  </span>
                )}
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                title={t.nav.logout}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 text-xs font-bold text-rose-600 hover:bg-rose-500/20 transition cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{t.nav.signOut}</span>
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex h-9 items-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3.5 text-xs font-bold text-[var(--text-primary)] transition hover:border-[var(--brand-coral)]/40 whitespace-nowrap cursor-pointer shadow-2xs"
              >
                {t.nav.login}
              </Link>

              <Link
                href="/signup"
                className="inline-flex h-9 items-center rounded-xl bg-[var(--brand-coral)] px-4 text-xs font-bold text-white shadow-sm shadow-[var(--brand-coral)]/20 transition hover:bg-[var(--accent-hover)] whitespace-nowrap cursor-pointer"
              >
                {t.nav.signup}
              </Link>
            </div>
          )}

          {/* Mobile / Tablet Navigation Drawer Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle Menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] lg:hidden cursor-pointer shadow-2xs"
          >
            {mobileMenuOpen ? (
              <X className="h-4 w-4 text-[var(--brand-coral)]" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Responsive Mobile & Tablet Drawer (< lg) */}
      {mobileMenuOpen && (
        <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-4 shadow-xl lg:hidden space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {primaryLinks.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact ? pathname === item.href : false;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition ${
                    isActive
                      ? 'bg-[var(--brand-coral)] text-white'
                      : 'bg-[var(--bg-subtle)]/70 text-[var(--text-primary)] hover:bg-[var(--bg-muted)]'
                  }`}
                >
                  {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {!session && (
            <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-subtle)] sm:hidden">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] py-2.5 text-xs font-bold text-[var(--text-primary)]"
              >
                {t.nav.login}
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center rounded-xl bg-[var(--brand-coral)] py-2.5 text-xs font-bold text-white"
              >
                {t.nav.signup}
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
