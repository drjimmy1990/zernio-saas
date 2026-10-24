'use client';

import React, { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import { getLocalizedText } from '@/i18n/dictionaries';
import {
  ALL_SOCIAL_PLATFORMS,
  ALL_AD_PLATFORMS,
  type SubServiceKey,
  type SocialPlatform,
  type AdPlatform,
  type EffectiveTenantPolicy,
} from '@/types/platform';
import {
  Link2,
  Send,
  MessageSquare,
  BarChart3,
  Megaphone,
  PhoneCall,
  ShoppingBag,
  Bot,
  CheckCircle2,
  Lock,
  RefreshCw,
  AlertTriangle,
  KeyRound,
  Store,
  MapPin,
  Code2,
  Plus,
  Copy,
  Check,
  ShieldCheck,
  ShoppingCart,
  Sliders,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  ConnectionWizardModal,
  PLATFORM_CATALOG,
  type ConnectedAccountData,
} from '@/components/dashboard/ConnectionWizardModal';
import { SaasWorkspace } from '@/components/dashboard/SaasWorkspace';
import { useDashboardMode } from '@/lib/hooks/useDashboardMode';
import { ExperienceModeSwitcher } from '@/components/dashboard/ExperienceModeSwitcher';
import { BusinessWorkspace } from '@/components/dashboard/BusinessWorkspace';
import { ConnectAndAccountsHub } from '@/components/dashboard/hubs/ConnectAndAccountsHub';
import { PublishingAndQueueHub } from '@/components/dashboard/hubs/PublishingAndQueueHub';
import { LaunchInboxWorkspace } from '@/components/dashboard/LaunchInboxWorkspace';
import { AdvancedPhoneWorkspace } from '@/components/dashboard/AdvancedPhoneWorkspace';
import { CustomerReportsWorkspace } from '@/components/dashboard/CustomerReportsWorkspace';
import { Asra3Mark } from '@/components/Asra3Logo';

interface WorkspaceResponse {
  policy: EffectiveTenantPolicy;
  subServicesData: {
    core_connect: {
      accounts: Array<{
        id?: string;
        accountId?: string;
        platform: string;
        username: string;
        displayName: string;
        status: string;
        needsReconnect?: boolean;
      }>;
    } | null;
    publishing?: {
      posts: Array<{
        id: string;
        content: string;
        platforms: Array<{ platform: string; accountId: string }>;
        status: string;
        createdAt: string;
      }>;
    } | null;
    inbox_crm: {
      data?: Array<{
        id: string;
        platform: string;
        accountId?: string;
        participantName: string;
        lastMessage?: string;
        unreadCount: number;
      }>;
    } | null;
    analytics: {
      totals?: {
        impressions: number;
        reach: number;
        engagementRate: number;
      };
      followers?: {
        gained: number;
      };
    } | null;
    ads?: {
      campaigns?: Array<{
        id: string;
        platform: string;
        name: string;
        status: string;
        spendUsd: number;
      }>;
    } | null;
    telephony?: {
      phoneNumbers?: Array<{
        phoneNumber: string;
        friendlyName?: string;
        capabilities: { sms: boolean; voice: boolean; whatsapp: boolean };
      }>;
      wallet?: {
        balanceUsd: number;
      };
      numbers?: Array<{
        phoneNumber: string;
      }>;
    } | null;
    commerce_local?: {
      products?: Array<{
        id: string;
        title: string;
        price: number;
      }>;
    } | null;
    developerHub?: any;
  };
}

function CustomerDashboardContent() {
  const { locale, dir, t } = useThemeAndLocale();
  const isRTL = dir === 'rtl';
  const isAr = isRTL;
  const loc = (ar: string, en: string) => getLocalizedText(locale, { ar, en });
  const router = useRouter();

  const searchParams = useSearchParams();
  const queryOrg = searchParams.get('org');
  const [organizationId, setOrganizationId] = useState<string>(queryOrg || '');
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const initialTab =
    (searchParams.get('tab') as SubServiceKey) || 'core_connect';

  const { mode, setMode } = useDashboardMode();

  type AdvancedHubKey =
    | 'connect'
    | 'publishing'
    | 'inbox_crm'
    | 'telephony'
    | 'ads_commerce'
    | 'developer';

  const [activeHub, setActiveHub] = useState<AdvancedHubKey>(() => {
    if (initialTab === 'publishing') return 'publishing';
    if (initialTab === 'inbox_crm') return 'inbox_crm';
    if (initialTab === 'telephony') return 'telephony';
    if (
      initialTab === 'ads' ||
      initialTab === 'analytics' ||
      initialTab === 'commerce_local'
    )
      return 'ads_commerce';
    if (initialTab === 'support_ai') return 'developer';
    return 'connect';
  });

  const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Auth & Session Check
  useEffect(() => {
    async function verifySession() {
      try {
        const res = await fetch('/api/auth?action=session');
        const sessionData = await res.json();
        if (!sessionData.authenticated || !sessionData.session) {
          router.push('/login?redirect=/dashboard');
          return;
        }
        if (sessionData.session.user?.role === 'super_admin') {
          setOrganizationId('');
          setWorkspace(null);
          router.replace('/admin');
          return;
        }

        const org =
          queryOrg ||
          sessionData.session.tenant?.organizationId ||
          (sessionData.session.user?.id
            ? `org_${sessionData.session.user.id}`
            : 'org_workspace');
        setOrganizationId(org);
        setAuthChecking(false);
      } catch {
        router.push('/login?redirect=/dashboard');
      }
    }
    void verifySession();
  }, [router, queryOrg]);

  const loadWorkspace = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/services?organizationId=${encodeURIComponent(organizationId)}`
      );
      const data = await res.json();
      if (!res.ok || data.error || data.success === false) throw new Error('Dashboard refresh failed');
      setWorkspace(data);
    } catch {
      setStatusBanner({
        type: 'error',
        message: loc(
          'تعذر تحديث البيانات، يرجى المحاولة مرة أخرى.',
          'Could not refresh dashboard data.'
        ),
      });
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    if (!authChecking && organizationId) {
      void loadWorkspace();
    }
  }, [authChecking, organizationId, loadWorkspace]);

  // Connection Wizard State
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [wizardPlatform, setWizardPlatform] = useState<SocialPlatform>('instagram');
  const [wizardInitialStep, setWizardInitialStep] = useState<1 | 2 | 3 | 4>(1);
  const [wizardTempToken, setWizardTempToken] = useState<string>('');
  const [wizardSelectionStep, setWizardSelectionStep] = useState<string>('');
  const [wizardInitialAccount, setWizardInitialAccount] =
    useState<ConnectedAccountData | null>(null);

  const acceptedCallback = useRef<string>('');
  // Accept once, then remove temporary authorization values from the browser URL.
  useEffect(() => {
    if (authChecking || !organizationId) return;
    const nonce = searchParams.get('asra3_oauth_state');
    const hasCallback = nonce || searchParams.has('tempToken') || searchParams.has('accountId') || searchParams.has('error');
    if (!hasCallback || acceptedCallback.current === searchParams.toString()) return;
    acceptedCallback.current = searchParams.toString();
    const callback = Object.fromEntries(searchParams.entries());
    void (async () => {
      try {
        const res = await fetch('/api/connect', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...callback, action: 'accept_oauth_callback', organizationId,
            oauthSessionId: nonce, platform: callback.connected || callback.platform }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'The provider callback could not be verified.');
        if (data.selectionRequired && data.oauthSessionId) {
          setWizardPlatform(data.platform);
          setWizardTempToken(data.oauthSessionId);
          setWizardSelectionStep(data.step);
          setWizardInitialAccount(null);
          setWizardInitialStep(3);
          setIsWizardOpen(true);
        } else if (data.success && data.account) {
          handleAccountConnected(data.account);
        } else {
          throw new Error('The provider has not confirmed the connection.');
        }
      } catch (error) {
        setStatusBanner({ type: 'error', message: error instanceof Error ? error.message : 'Restart the connection and try again.' });
      } finally {
        const clean = new URL(window.location.href);
        for (const key of ['asra3_oauth_state', 'oauth_callback', 'reconnectAccountId', 'simulated', 'tempToken', 'userProfile', 'connect_token', 'profileId', 'accountId', 'connected', 'platform', 'step', 'username', 'error', 'error_description', 'state', 'request_id', 'stage']) clean.searchParams.delete(key);
        window.history.replaceState(null, '', clean.pathname + clean.search + clean.hash);
      }
    })();
  }, [authChecking, organizationId, searchParams]);

  const handleOpenWizard = (
    platform?: SocialPlatform,
    step: 1 | 2 | 3 | 4 = 1,
    account?: ConnectedAccountData | null
  ) => {
    if (platform) {
      setWizardPlatform(platform);
    }
    setWizardTempToken('');
    setWizardSelectionStep('');
    setWizardInitialStep(step);
    setWizardInitialAccount(account || null);
    setIsWizardOpen(true);
  };

  const handleAccountDisconnected = (accountId: string) => {
    setWorkspace((prev) => {
      if (!prev) return prev;
      const currentAccounts = prev.subServicesData.core_connect?.accounts || [];
      const updatedAccounts = currentAccounts.filter(
        (a) => a.id !== accountId && a.accountId !== accountId
      );
      return {
        ...prev,
        subServicesData: {
          ...prev.subServicesData,
          core_connect: {
            ...prev.subServicesData.core_connect,
            accounts: updatedAccounts,
          },
        },
      };
    });

    setStatusBanner({
      type: 'success',
      message: loc(
        'تم فصل القناة وإلغاء الربط بنجاح من لوحة التحكم.',
        'Account disconnected successfully from dashboard workspace.'
      ),
    });
  };

  const handleAccountConnected = (newAccount: ConnectedAccountData) => {
    setWorkspace((prev) => {
      if (!prev) return prev;
      const currentAccounts = prev.subServicesData.core_connect?.accounts || [];
      const index = currentAccounts.findIndex(
        (a) =>
          a.id === newAccount.id ||
          a.accountId === newAccount.accountId ||
          (a.platform === newAccount.platform &&
            a.username === newAccount.username)
      );

      let updatedAccounts;
      if (index >= 0) {
        updatedAccounts = [...currentAccounts];
        updatedAccounts[index] = {
          ...updatedAccounts[index],
          ...newAccount,
        };
      } else {
        updatedAccounts = [
          {
            id: newAccount.id,
            accountId: newAccount.accountId,
            platform: newAccount.platform,
            username: newAccount.username,
            displayName: newAccount.displayName,
            status: newAccount.status || 'healthy',
            needsReconnect: false,
          },
          ...currentAccounts,
        ];
      }

      return {
        ...prev,
        subServicesData: {
          ...prev.subServicesData,
          core_connect: {
            ...prev.subServicesData.core_connect,
            accounts: updatedAccounts,
          },
        },
      };
    });

    setStatusBanner({
      type: 'success',
      message: loc(
        `تم ربط وتأكيد حساب ${newAccount.displayName} (${newAccount.username}) بنجاح!`,
        `Connected and verified ${newAccount.displayName} (${newAccount.username}) successfully!`
      ),
    });
  };

  const policy = workspace?.policy;

  if (authChecking || (loading && !workspace)) {
    return (
      <div className="space-y-6 animate-pulse" aria-busy="true">
        {/* Top Header Card Skeleton */}
        <div className="luxury-card p-5 rounded-3xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[var(--bg-subtle)]" />
            <div className="space-y-2">
              <div className="h-4 w-36 rounded-md bg-[var(--bg-subtle)]" />
              <div className="h-3 w-56 rounded-md bg-[var(--bg-subtle)]" />
            </div>
          </div>
          <div className="flex gap-2.5">
            <div className="h-9 w-28 rounded-xl bg-[var(--bg-subtle)]" />
            <div className="h-9 w-20 rounded-xl bg-[var(--bg-subtle)]" />
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="tab-pill-container flex gap-2 overflow-hidden p-1.5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-8 w-24 rounded-xl bg-[var(--bg-card)]/60" />
          ))}
        </div>

        {/* Main Workspace Stage Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 luxury-card p-6 rounded-3xl space-y-4">
            <div className="h-5 w-32 rounded-md bg-[var(--bg-subtle)]" />
            <div className="space-y-3 pt-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 w-full rounded-2xl bg-[var(--bg-subtle)]" />
              ))}
            </div>
          </div>
          <div className="lg:col-span-8 luxury-card p-6 rounded-3xl space-y-4">
            <div className="h-5 w-48 rounded-md bg-[var(--bg-subtle)]" />
            <div className="h-56 w-full rounded-2xl bg-[var(--bg-subtle)]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[var(--text-primary)]">
      {/* Top Header Card with Experience Mode Switcher */}
      <div className="luxury-card p-5 rounded-3xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Asra3Mark size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-[var(--text-primary)]">
                  {loc('مساحة عملي — Asra3', 'My Asra3 Workspace')}
                </h1>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-600">
                  {loc('نشط', 'Active')}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {mode === 'simple'
                  ? loc(
                      'الوضع المبسط: معالجات موجهة بنقرة واحدة لسرعة الإنجاز بدون تعقيد',
                      'Simple Mode: 1-Click Guided Wizards for effortless operations'
                    )
                  : loc(
                      'الوضع الاحترافي: إدارة متقدمة لكافة القنوات، مسارات العمل، والـ API',
                      'Advanced Pro Mode: Complete control over all channels, workflows & APIs'
                    )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Experience Mode Switcher */}
            <ExperienceModeSwitcher />

            <button
              onClick={() => void loadWorkspace()}
              className="btn-premium-secondary inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
              />
              <span>{t.dashboard.syncBtn}</span>
            </button>

            {mode === 'advanced' && (
              <Link
                href="/docs"
                className="btn-premium-secondary inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold"
              >
                <Code2 className="h-3.5 w-3.5 text-[var(--brand-coral)]" />
                <span>{t.nav.docs}</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Status Notification Toast */}
      {statusBanner && (
        <div
          className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium ${
            statusBanner.type === 'error'
              ? 'border-rose-500/30 bg-rose-500/10 text-rose-600'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusBanner.type === 'error' ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <span>{statusBanner.message}</span>
          </div>
          <button
            onClick={() => setStatusBanner(null)}
            className="text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Workspace Stage: Clean Branching between Simple Mode & Advanced Pro Mode */}
      {mode === 'simple' ? (
        <BusinessWorkspace
          workspace={workspace}
          policy={policy}
          onOpenConnectionWizard={(platform, account) => handleOpenWizard(platform as any, account ? 2 : 1, account || null)}
          onRefreshWorkspace={() => void loadWorkspace()}
        />
      ) : (
        /* Advanced Pro Mode with 5 Modular Visual Hubs + Developer Console */
        <div className="space-y-6">
          {/* 6-Hub Symmetrical Navigation Bar */}
          <div className="overflow-x-auto pb-1 scrollbar-hide">
            <div className="tab-pill-container inline-flex min-w-full lg:min-w-0 justify-between">
              {[
                {
                  id: 'connect',
                  label: loc('الحسابات والربط', 'Connect & Accounts'),
                  icon: Link2,
                },
                {
                  id: 'publishing',
                  label: loc('النشر والجدولة', 'Publishing & Queue'),
                  icon: Send,
                },
                {
                  id: 'inbox_crm',
                  label: loc('المحادثات والعملاء', 'Inbox and contacts'),
                  icon: MessageSquare,
                },
                {
                  id: 'telephony',
                  label: loc('الأرقام وواتساب', 'Phone & WhatsApp'),
                  icon: PhoneCall,
                },
                {
                  id: 'ads_commerce',
                  label: loc('التقارير', 'Reports'),
                  icon: BarChart3,
                },
                {
                  id: 'developer',
                  label: loc('الفريق والإعدادات', 'Team and settings'),
                  icon: Code2,
                },
              ].map((hub) => {
                const Icon = hub.icon;
                const isSelected = activeHub === hub.id;
                return (
                  <button
                    key={hub.id}
                    onClick={() => setActiveHub(hub.id as AdvancedHubKey)}
                    className={`tab-pill-btn flex-1 justify-center ${
                      isSelected
                        ? 'tab-pill-btn-active !text-[var(--text-primary)]'
                        : 'hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 transition-colors ${isSelected ? 'text-[var(--brand-coral)]' : 'text-[var(--text-muted)]'}`} />
                    <span className="truncate">{hub.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Hub View */}
          {activeHub === 'connect' && (
            <ConnectAndAccountsHub
              workspace={workspace}
              policy={policy}
              onOpenConnectionWizard={(platform, account) =>
                handleOpenWizard(platform as any, account ? 2 : 1, account || null)
              }
              onRefreshWorkspace={() => void loadWorkspace()}
            />
          )}

          {activeHub === 'publishing' && (
            <PublishingAndQueueHub
              workspace={workspace}
              policy={policy}
              onRefreshWorkspace={() => void loadWorkspace()}
            />
          )}

          {activeHub === 'inbox_crm' && (
            <LaunchInboxWorkspace
              workspace={workspace}
              policy={policy}
              onRefreshWorkspace={() => void loadWorkspace()}
            />
          )}

          {activeHub === 'telephony' && <AdvancedPhoneWorkspace />}
          {activeHub === 'ads_commerce' && <CustomerReportsWorkspace />}
          {activeHub === 'developer' && <SaasWorkspace />}
        </div>
      )}

      {/* 4-Step Social & Messaging Connection Wizard Modal */}
      <ConnectionWizardModal
        isOpen={isWizardOpen}
        onClose={() => {
          setIsWizardOpen(false);
          setWizardInitialAccount(null);
          setWizardTempToken('');
          setWizardSelectionStep('');
          setWizardInitialStep(1);
        }}
        initialPlatform={wizardPlatform}
        initialStep={wizardInitialStep}
        initialOAuthSessionId={wizardTempToken}
        initialSelectionStep={wizardSelectionStep}
        initialAccount={wizardInitialAccount}
        organizationId={organizationId}
        onAccountConnected={handleAccountConnected}
        onAccountDisconnected={handleAccountDisconnected}
        onOpenBuyNumberWizard={() => {
          setIsWizardOpen(false);
          if (mode === 'advanced') setActiveHub('telephony');
          else window.location.assign('/dashboard?tab=telephony');
        }}
      />
    </div>
  );
}

export default function CustomerDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] text-sm font-semibold text-[var(--text-secondary)]">
          Loading Asra3 Dashboard...
        </div>
      }
    >
      <CustomerDashboardContent />
    </Suspense>
  );
}
