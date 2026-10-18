'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import {
  ALL_SOCIAL_PLATFORMS,
  ALL_AD_PLATFORMS,
  ALL_OAUTH_SCOPES,
  SUB_SERVICE_CATALOG,
  type SocialPlatform,
  type AdPlatform,
  type OAuthScopeArea,
  type SubServiceKey,
} from '@/types/platform';
import type {
  GlobalAdminConfigState,
  PlanTemplateState,
  TenantOverrideState,
} from '@/lib/zernio/policy-engine';
import {
  ShieldCheck,
  Sliders,
  KeyRound,
  DollarSign,
  Building2,
  RefreshCw,
  PlusCircle,
  ExternalLink,
} from 'lucide-react';

interface AdminSnapshot {
  globalConfig: GlobalAdminConfigState;
  plans: PlanTemplateState[];
  tenants: TenantOverrideState[];
  billingReport?: {
    live: boolean;
    zernioTeamTotals: Record<string, number>;
    tenantRows: Array<{
      organizationId: string;
      organizationName: string;
      zernioProfileId: string | null;
      planKey: string;
      retailRevenueUsd: number;
      zernioWholesaleUsd: number;
      grossMarginUsd: number;
      marginPercent: number;
    }>;
  };
}

const SUB_SERVICES_LIST = Object.values(SUB_SERVICE_CATALOG);
type AdminTab = 'global' | 'plans' | 'tenants' | 'billing';

export default function SuperAdminControlPlanePage() {
  const router = useRouter();
  const { t } = useThemeAndLocale();
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('global');
  const [data, setData] = useState<AdminSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPlanKey, setSelectedPlanKey] = useState<string>('starter');
  const [mintedKeySecret, setMintedKeySecret] = useState<string>('');

  // Quick Create Tenant state inside Admin
  const [newOrgName, setNewOrgName] = useState<string>('');
  const [newOrgPlan, setNewOrgPlan] = useState<string>('agency');
  const [newOrgColor, setNewOrgColor] = useState<string>('#eb3514');

  const fetchSnapshot = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin');
      if (res.status === 401) {
        router.push('/login?redirect=/admin');
        return;
      }
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth?action=session');
        const sessionData = await res.json();
        if (!sessionData.authenticated || sessionData.session?.user?.role !== 'super_admin') {
          router.push('/login?redirect=/admin');
          return;
        }
        setAuthChecking(false);
        void fetchSnapshot();
      } catch {
        router.push('/login?redirect=/admin');
      }
    }
    void checkAuth();
  }, [router, fetchSnapshot]);

  const updateGlobalConfig = async (patch: Record<string, unknown>) => {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_global_config',
        patch,
      }),
    });
    const json = await res.json();
    if (json.snapshot) {
      setData((prev) => (prev ? { ...prev, ...json.snapshot } : json.snapshot));
    }
  };

  const toggleGlobalPlatform = (platform: SocialPlatform) => {
    if (!data) return;
    const current = data.globalConfig.enabledPlatforms;
    const next = current.includes(platform)
      ? current.filter((p) => p !== platform)
      : [...current, platform];
    void updateGlobalConfig({ enabledPlatforms: next });
  };

  const toggleGlobalAdPlatform = (adPlatform: AdPlatform) => {
    if (!data) return;
    const current = data.globalConfig.enabledAdPlatforms;
    const next = current.includes(adPlatform)
      ? current.filter((p) => p !== adPlatform)
      : [...current, adPlatform];
    void updateGlobalConfig({ enabledAdPlatforms: next });
  };

  const toggleGlobalScope = (scope: OAuthScopeArea) => {
    if (!data) return;
    const current = data.globalConfig.enabledOAuthScopes;
    const next = current.includes(scope)
      ? current.filter((s) => s !== scope)
      : [...current, scope];
    void updateGlobalConfig({ enabledOAuthScopes: next });
  };

  const toggleGlobalSubService = (subService: SubServiceKey) => {
    if (!data) return;
    const current = data.globalConfig.enabledSubServices;
    const next = current.includes(subService)
      ? current.filter((s) => s !== subService)
      : [...current, subService];
    void updateGlobalConfig({ enabledSubServices: next });
  };

  const togglePlanSubService = async (
    planKey: string,
    subService: SubServiceKey
  ) => {
    if (!data) return;
    const plan = data.plans.find((p) => p.planKey === planKey);
    if (!plan) return;
    const current = plan.enabledSubServices;
    const next = current.includes(subService)
      ? current.filter((s) => s !== subService)
      : [...current, subService];

    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_plan_template',
        planKey,
        patch: { enabledSubServices: next },
      }),
    });
    const json = await res.json();
    if (json.snapshot) {
      setData((prev) => (prev ? { ...prev, ...json.snapshot } : json.snapshot));
    }
  };

  const togglePlanScope = async (planKey: string, scope: OAuthScopeArea) => {
    if (!data) return;
    const plan = data.plans.find((p) => p.planKey === planKey);
    if (!plan) return;
    const current = plan.allowedOAuthScopes;
    const next = current.includes(scope)
      ? current.filter((s) => s !== scope)
      : [...current, scope];

    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_plan_template',
        planKey,
        patch: { allowedOAuthScopes: next },
      }),
    });
    const json = await res.json();
    if (json.snapshot) {
      setData((prev) => (prev ? { ...prev, ...json.snapshot } : json.snapshot));
    }
  };

  const handleUpdateTenant = async (
    organizationId: string,
    patch: Record<string, unknown>
  ) => {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_tenant_override',
        organizationId,
        patch,
      }),
    });
    const json = await res.json();
    if (json.snapshot) {
      setData((prev) => (prev ? { ...prev, ...json.snapshot } : json.snapshot));
    }
  };

  const handleMintScopedKey = async (organizationId: string) => {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'mint_scoped_key',
        organizationId,
        permission: 'write',
      }),
    });
    const json = await res.json();
    if (json.snapshot) {
      setData((prev) => (prev ? { ...prev, ...json.snapshot } : json.snapshot));
    }
    if (json.minted?.apiKey?.key) {
      setMintedKeySecret(
        `${organizationId} → ${json.minted.apiKey.key}`
      );
    }
  };

  const handleCreateTenantInAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_tenant',
        organizationName: newOrgName.trim(),
        planKey: newOrgPlan,
        primaryColor: newOrgColor,
      }),
    });
    const json = await res.json();
    if (json.snapshot) {
      setData((prev) => (prev ? { ...prev, ...json.snapshot } : json.snapshot));
    }
    setNewOrgName('');
  };

  const handleDeleteTenant = async (organizationId: string) => {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete_tenant',
        organizationId,
      }),
    });
    const json = await res.json();
    if (json.snapshot) {
      setData((prev) => (prev ? { ...prev, ...json.snapshot } : json.snapshot));
    }
  };

  const selectedPlan = data?.plans.find((p) => p.planKey === selectedPlanKey);

  if (authChecking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-coral)] border-t-transparent" />
          <p className="text-sm font-medium text-[var(--text-secondary)]">Verifying super admin access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-[var(--text-primary)]">
      <div className="space-y-8">
        {/* Executive Header */}
        <div className="luxury-card p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-bold text-[var(--accent-primary)]">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Asra3 Governance Engine</span>
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {t.admin.title}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {t.admin.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() =>
                updateGlobalConfig({
                  enforceHeadlessOAuth:
                    !data?.globalConfig.enforceHeadlessOAuth,
                })
              }
              className={`rounded-xl border px-4 py-2.5 text-xs font-bold transition ${
                data?.globalConfig.enforceHeadlessOAuth
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
              }`}
            >
              {data?.globalConfig.enforceHeadlessOAuth
                ? `✓ ${t.admin.headlessEnforced}`
                : t.admin.headlessOptional}
            </button>

            <button
              onClick={() => fetchSnapshot()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
              />
              <span>{t.dashboard.syncBtn}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'global', label: t.admin.tabGlobal, icon: Sliders },
              { id: 'plans', label: t.admin.tabPlans, icon: KeyRound },
              { id: 'tenants', label: t.admin.tabTenants, icon: Building2 },
              { id: 'billing', label: t.admin.tabBilling, icon: DollarSign },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                  active
                    ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                    : 'border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: GLOBAL SWITCHBOARD */}
        {activeTab === 'global' && data && (
          <div className="space-y-6">
            {/* 8 Sub-Services Master Switches */}
            <div className="luxury-card p-6">
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                {t.admin.globalServicesTitle}
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {SUB_SERVICES_LIST.map((svc) => {
                  const enabled =
                    data.globalConfig.enabledSubServices.includes(svc.key);
                  const localizedSvc = t.subServicesSection.services[svc.key];
                  return (
                    <button
                      key={svc.key}
                      onClick={() => toggleGlobalSubService(svc.key)}
                      className={`flex flex-col justify-between rounded-2xl border p-4 text-start transition ${
                        enabled
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-[var(--text-primary)]">
                          {localizedSvc.shortTitle}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            enabled
                              ? 'bg-emerald-500/20 text-emerald-600'
                              : 'bg-rose-500/20 text-rose-600'
                          }`}
                        >
                          {enabled ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] text-[var(--text-secondary)] line-clamp-2">
                        {localizedSvc.tagline}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* OAuth Scopes */}
            <div className="luxury-card p-6">
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                {t.admin.globalScopesTitle}
              </h2>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {ALL_OAUTH_SCOPES.map((scope) => {
                  const enabled =
                    data.globalConfig.enabledOAuthScopes.includes(scope);
                  return (
                    <button
                      key={scope}
                      onClick={() => toggleGlobalScope(scope)}
                      className={`rounded-xl border px-4 py-2 text-xs font-bold capitalize transition ${
                        enabled
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-primary)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                      }`}
                    >
                      {enabled ? '✓ ' : '✕ '}
                      {scope}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 18 Social Platforms & 8 Ad Platforms */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="luxury-card p-6">
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  {t.admin.globalPlatformsTitle}
                </h2>
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {ALL_SOCIAL_PLATFORMS.map((platform) => {
                    const enabled =
                      data.globalConfig.enabledPlatforms.includes(platform);
                    return (
                      <button
                        key={platform}
                        onClick={() => toggleGlobalPlatform(platform)}
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold capitalize transition ${
                          enabled
                            ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-primary)]'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-muted)] opacity-50'
                        }`}
                      >
                        {platform}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="luxury-card p-6">
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  {t.admin.globalAdsTitle}
                </h2>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {ALL_AD_PLATFORMS.map((ad) => {
                    const enabled =
                      data.globalConfig.enabledAdPlatforms.includes(ad);
                    return (
                      <button
                        key={ad}
                        onClick={() => toggleGlobalAdPlatform(ad)}
                        className={`rounded-xl border px-3 py-2 text-xs font-bold uppercase transition ${
                          enabled
                            ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-primary)]'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-muted)] opacity-50'
                        }`}
                      >
                        {ad}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PLAN TEMPLATES */}
        {activeTab === 'plans' && data && (
          <div className="luxury-card p-6 space-y-6">
            <div className="flex flex-wrap gap-2">
              {data.plans.map((p) => (
                <button
                  key={p.planKey}
                  onClick={() => setSelectedPlanKey(p.planKey)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold uppercase transition ${
                    selectedPlanKey === p.planKey
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                  }`}
                >
                  {p.displayName} (${p.monthlyPriceUsd}/mo)
                </button>
              ))}
            </div>

            {selectedPlan && (
              <div className="space-y-6 pt-2">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {t.admin.globalServicesTitle} ({selectedPlan.displayName})
                  </h3>
                  <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {SUB_SERVICES_LIST.map((svc) => {
                      const on = selectedPlan.enabledSubServices.includes(
                        svc.key
                      );
                      return (
                        <button
                          key={svc.key}
                          onClick={() =>
                            togglePlanSubService(selectedPlan.planKey, svc.key)
                          }
                          className={`rounded-xl border p-3 text-start text-xs font-bold transition ${
                            on
                              ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-primary)]'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                          }`}
                        >
                          {on ? '✓ ' : '✕ '}
                          {t.subServicesSection.services[svc.key].shortTitle}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {t.admin.globalScopesTitle} ({selectedPlan.displayName})
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ALL_OAUTH_SCOPES.map((scope) => {
                      const on = selectedPlan.allowedOAuthScopes.includes(scope);
                      return (
                        <button
                          key={scope}
                          onClick={() =>
                            togglePlanScope(selectedPlan.planKey, scope)
                          }
                          className={`rounded-xl border px-3.5 py-2 text-xs font-bold capitalize ${
                            on
                              ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-primary)]'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                          }`}
                        >
                          {on ? '✓ ' : '✕ '}
                          {scope}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: TENANTS & SCOPED API KEYS */}
        {activeTab === 'tenants' && data && (
          <div className="space-y-6">
            {/* Provision New Tenant Card */}
            <form
              onSubmit={handleCreateTenantInAdmin}
              className="luxury-card p-6 flex flex-wrap items-end gap-4"
            >
              <div className="flex-1 min-w-[220px]">
                <label className="block text-xs font-bold text-[var(--text-secondary)]">
                  Organization Name
                </label>
                <input
                  required
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="Royal Gulf Media Group"
                  className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)]">
                  Plan
                </label>
                <select
                  value={newOrgPlan}
                  onChange={(e) => setNewOrgPlan(e.target.value)}
                  className="mt-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2 text-xs font-semibold"
                >
                  {data.plans.map((p) => (
                    <option key={p.planKey} value={p.planKey}>
                      {p.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)]">
                  Brand Color
                </label>
                <input
                  type="color"
                  value={newOrgColor}
                  onChange={(e) => setNewOrgColor(e.target.value)}
                  className="mt-1.5 h-9 w-16 cursor-pointer rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-1"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[var(--accent-hover)]"
              >
                <PlusCircle className="h-4 w-4" />
                <span>{t.admin.provisionTenantBtn}</span>
              </button>
            </form>

            {mintedKeySecret && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 font-mono text-xs text-emerald-700">
                🔑 Scoped API Key Minted: <strong>{mintedKeySecret}</strong>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {data.tenants.length === 0 ? (
                <div className="luxury-card p-10 text-center">
                  <Building2 className="mx-auto h-8 w-8 text-[var(--text-muted)] opacity-60" />
                  <p className="mt-3 text-sm font-bold text-[var(--text-primary)]">
                    No customer organizations registered yet
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Real customer workspaces created via /signup or provisioned above will appear here automatically.
                  </p>
                </div>
              ) : (
                data.tenants.map((tenant) => (
                  <div
                    key={tenant.organizationId}
                    className="luxury-card p-6 flex flex-wrap items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-base font-bold text-[var(--text-primary)]">
                          {tenant.organizationName}
                        </span>
                        <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs font-bold uppercase text-[var(--accent-primary)]">
                          {tenant.planKey}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            tenant.status === 'active'
                              ? 'bg-emerald-500/15 text-emerald-600'
                              : 'bg-rose-500/15 text-rose-600'
                          }`}
                        >
                          {tenant.status}
                        </span>
                      </div>
                      <div className="mt-1 font-mono text-xs text-[var(--text-muted)]">
                        {tenant.organizationId} · Profile:{' '}
                        {tenant.zernioProfileId || 'Unassigned'} · Key:{' '}
                        {tenant.zernioScopedKeyPrefix || 'None'}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/dashboard?org=${encodeURIComponent(
                          tenant.organizationId
                        )}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-primary)]"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>{t.admin.openWorkspaceBtn}</span>
                      </Link>

                      <button
                        onClick={() => handleMintScopedKey(tenant.organizationId)}
                        className="rounded-xl bg-[var(--accent-primary)] px-3.5 py-2 text-xs font-bold text-white hover:bg-[var(--accent-hover)]"
                      >
                        {t.admin.mintKeyBtn}
                      </button>

                      <button
                        onClick={() =>
                          handleUpdateTenant(tenant.organizationId, {
                            status:
                              tenant.status === 'active' ? 'suspended' : 'active',
                          })
                        }
                        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]"
                      >
                        {tenant.status === 'active'
                          ? t.admin.suspendBtn
                          : t.admin.restoreBtn}
                      </button>

                      <button
                        onClick={() => handleDeleteTenant(tenant.organizationId)}
                        className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-500/20"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: WHOLESALE VS RETAIL BILLING */}
        {activeTab === 'billing' && data?.billingReport && (
          <div className="luxury-card overflow-hidden">
            <div className="p-6 border-b border-[var(--border-subtle)]">
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                {t.admin.billingTitle}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-muted)] uppercase">
                  <tr>
                    <th className="px-6 py-3.5 text-start">
                      {t.admin.colTenant}
                    </th>
                    <th className="px-6 py-3.5 text-start">
                      {t.admin.colProfile}
                    </th>
                    <th className="px-6 py-3.5 text-start">{t.admin.colPlan}</th>
                    <th className="px-6 py-3.5 text-start">
                      {t.admin.colWholesale}
                    </th>
                    <th className="px-6 py-3.5 text-start">
                      {t.admin.colRetail}
                    </th>
                    <th className="px-6 py-3.5 text-start">
                      {t.admin.colMargin}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {data.billingReport.tenantRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-10 text-center text-xs text-[var(--text-muted)]"
                      >
                        No customer workspaces registered yet. Once real accounts sign up or are provisioned, their live wholesale usage and retail subscription margins will appear here.
                      </td>
                    </tr>
                  ) : (
                    data.billingReport.tenantRows.map((row) => (
                      <tr key={row.organizationId}>
                        <td className="px-6 py-4 font-bold text-[var(--text-primary)]">
                          {row.organizationName}
                        </td>
                        <td className="px-6 py-4 font-mono text-[var(--text-muted)]">
                          {row.zernioProfileId}
                        </td>
                        <td className="px-6 py-4 uppercase font-semibold text-[var(--accent-primary)]">
                          {row.planKey}
                        </td>
                        <td className="px-6 py-4 font-mono">
                          ${row.zernioWholesaleUsd}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold">
                          ${row.retailRevenueUsd}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-emerald-600">
                          +${row.grossMarginUsd} ({row.marginPercent}%)
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
