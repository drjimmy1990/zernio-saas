'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LOCALE_META, type SupportedLocale } from '@/i18n/dictionaries';
import { getLandingCopy } from '@/i18n/landingTranslations';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import type { AuthSession } from '@/lib/auth/session';
import { ExperienceModeSwitcher } from '@/components/dashboard/ExperienceModeSwitcher';
import {
  ShieldCheck,
  LayoutDashboard,
  BookOpen,
  Sun,
  Moon,
  Globe,
  Sparkles,
  LogOut,
  User,
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, setLocale, theme, toggleTheme, t } = useThemeAndLocale();
  const landingCopy = getLandingCopy(locale);

  const [session, setSession] = useState<AuthSession | null>(null);

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

  const isHome = pathname === '/';

  // Build route nav items dynamically based on authenticated state
  const navItems = [
    { href: '/', label: t.nav.home },
    ...(session
      ? [{ href: '/dashboard', label: t.nav.workspace, icon: LayoutDashboard }]
      : []),
    { href: '/docs', label: t.nav.docs, icon: BookOpen },
    ...(session?.user.role === 'super_admin'
      ? [{ href: '/admin', label: t.nav.admin, icon: ShieldCheck, isAdmin: true }]
      : []),
  ];

  const homeAnchors = [
    { href: '#platforms', label: landingCopy.navAnchors.platforms },
    { href: '#telephony', label: landingCopy.navAnchors.telephony },
    { href: '#ads', label: landingCopy.navAnchors.ads },
    { href: '#developers', label: landingCopy.navAnchors.developers },
    { href: '#pricing', label: landingCopy.navAnchors.pricing },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--bg-header)] backdrop-blur-xl transition-colors">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand Identity: Techurity (techurity.si) */}
        <Link href="/" className="flex items-center gap-3 cursor-pointer group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-coral)] text-white shadow-sm shadow-[var(--brand-coral)]/25 transition-transform group-hover:scale-105">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-tight text-[var(--text-primary)]">
                Techurity
              </span>
              <span
                dir="ltr"
                className="rounded-full border border-[var(--brand-coral)]/30 bg-[var(--brand-coral-soft)] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[var(--brand-coral)]"
              >
                techurity.si
              </span>
            </div>
            <p className="hidden text-[11px] text-[var(--text-secondary)] xl:block max-w-[300px] truncate">
              {t.brand.tagline}
            </p>
          </div>
        </Link>

        {/* Center Navigation Links + Homepage Section Anchors */}
        <nav
          aria-label="Main Navigation"
          className="flex flex-wrap items-center gap-1"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-[var(--brand-coral)] text-white shadow-sm'
                    : item.isAdmin
                    ? 'border border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                <span>{item.label}</span>
              </Link>
            );
          })}

          {isHome && (
            <div className="hidden lg:flex items-center gap-1 ms-1 ps-2 border-s border-[var(--border-subtle)]">
              {homeAnchors.map((anchor) => (
                <a
                  key={anchor.href}
                  href={anchor.href}
                  className="rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-muted)] hover:text-[var(--brand-coral)] cursor-pointer"
                >
                  {anchor.label}
                </a>
              ))}
            </div>
          )}
        </nav>

        {/* Right Controls: Experience Mode Switcher (on /dashboard) + 10-Language Switcher + Light/Dark Toggle + Dynamic Auth State */}
        <div className="flex items-center gap-2">
          {pathname === '/dashboard' && (
            <ExperienceModeSwitcher compact className="hidden sm:inline-flex" />
          )}

          {/* 10-Language Switcher */}
          <div className="relative flex items-center">
            <Globe className="pointer-events-none absolute start-2.5 h-3.5 w-3.5 text-[var(--brand-coral)]" />
            <select
              aria-label="Select Language"
              value={locale}
              onChange={(e) => setLocale(e.target.value as SupportedLocale)}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] py-2 ps-8 pe-3 text-xs font-bold text-[var(--text-primary)] focus:border-[var(--brand-coral)] focus:outline-none cursor-pointer shadow-2xs"
            >
              {LOCALE_META.map((loc) => (
                <option key={loc.code} value={loc.code}>
                  {loc.flag} {loc.nativeName}
                </option>
              ))}
            </select>
          </div>

          {/* Theme Toggle (Executive Light / Velvet Dark) */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? t.nav.darkMode : t.nav.lightMode}
            title={theme === 'light' ? t.nav.darkMode : t.nav.lightMode}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] transition hover:border-[var(--brand-coral)]/40 cursor-pointer shadow-2xs"
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
                className="hidden sm:flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-1.5 text-xs transition hover:border-[var(--brand-coral)]/40"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-coral)]/15 text-[var(--brand-coral)]">
                  <User className="h-3 w-3" />
                </div>
                <div className="text-start">
                  <div className="max-w-[120px] truncate font-bold text-[var(--text-primary)] text-[11px]">
                    {session.user.fullName || session.user.email}
                  </div>
                  <div className="max-w-[120px] truncate text-[9px] text-[var(--text-secondary)]">
                    {session.tenant.organizationName}
                  </div>
                </div>
                {session.user.role === 'super_admin' && (
                  <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 text-[9px] font-bold text-amber-600">
                    Admin
                  </span>
                )}
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                title={t.nav.logout}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-500/20 transition cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.nav.signOut}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3.5 py-2 text-xs font-bold text-[var(--text-primary)] transition hover:border-[var(--brand-coral)]/40 sm:inline-flex cursor-pointer shadow-2xs"
              >
                {t.nav.login}
              </Link>

              <Link
                href="/signup"
                className="inline-flex items-center rounded-xl bg-[var(--brand-coral)] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-[var(--brand-coral)]/20 transition hover:bg-[var(--accent-hover)] cursor-pointer"
              >
                {t.nav.signup}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
