'use client';

import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  ShoppingBag,
  BarChart3,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  DollarSign,
  TrendingUp,
  Target,
  Sparkles,
  Tag,
  Store,
  Layers,
  ArrowRight,
  ExternalLink,
  Phone,
  MessageCircle,
  Users,
} from 'lucide-react';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import { getLocalizedText } from '@/i18n/dictionaries';

interface AdsCommerceAnalyticsHubProps {
  workspace: any;
  policy: any;
  onRefreshWorkspace?: () => void;
}

export function AdsCommerceAnalyticsHub({
  workspace,
  policy,
  onRefreshWorkspace,
}: AdsCommerceAnalyticsHubProps) {
  const { locale, dir } = useThemeAndLocale();
  const isRTL = dir === 'rtl';
  const loc = (ar: string, en: string) => getLocalizedText(locale, { ar, en });

  const [activeSubTab, setActiveSubTab] = useState<
    'ads_builder' | 'audiences' | 'lead_forms' | 'pixels' | 'ad_library' | 'analytics_heatmaps' | 'commerce' | 'gbp_services'
  >('ads_builder');

  // 1. Ads Builder State
  const [adObjective, setAdObjective] = useState<'ctwa' | 'call'>('ctwa');
  const [adName, setAdName] = useState<string>('');
  const [adHeadline, setAdHeadline] = useState<string>('');
  const [adBudget, setAdBudget] = useState<number>(20);
  const [targetNumber, setTargetNumber] = useState<string>('');
  const [isLaunchingAd, setIsLaunchingAd] = useState<boolean>(false);
  const [adLaunched, setAdLaunched] = useState<boolean>(false);
  const [adLaunchError, setAdLaunchError] = useState<string | null>(null);

  // 2. Audiences & Targeting Discovery
  const [targetingQuery, setTargetingQuery] = useState<string>('');
  const [targetingResults, setTargetingResults] = useState<any[]>([]);
  const [searchingTargeting, setSearchingTargeting] = useState<boolean>(false);

  // 3. Lead Forms & Leads Table
  const [leadForms, setLeadForms] = useState<any[]>([]);
  const [submittedLeads, setSubmittedLeads] = useState<any[]>([]);

  // 4. Pixels & Tracking Tags
  const [pixels, setPixels] = useState<any[]>([]);

  // 5. Competitor Ad Library Spy Search
  const [libraryQuery, setLibraryQuery] = useState<string>('');
  const [libraryResults, setLibraryResults] = useState<any[]>([]);
  const [searchingLibrary, setSearchingLibrary] = useState<boolean>(false);

  // 6. Analytics & Heatmap State
  const [bestTimesSlots, setBestTimesSlots] = useState<any[]>([]);

  // 7. Commerce Suite
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [discounts, setDiscounts] = useState<any[]>([]);

  // 8. GBP Services Menu
  const [gbpServices, setGbpServices] = useState<any[]>([]);

  const handleLaunchAd = async () => {
    if (!adName.trim() || !adHeadline.trim()) {
      setAdLaunchError(loc('يرجى إدخال اسم الحملة والعنوان الرئيسي', 'Please enter campaign name and headline.'));
      return;
    }
    setIsLaunchingAd(true);
    setAdLaunched(false);
    setAdLaunchError(null);
    try {
      const endpoint = adObjective === 'ctwa' ? '/api/v1/ads/ctwa' : '/api/v1/ads/call';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: adName.trim(),
          headline: adHeadline.trim(),
          dailyBudgetUsd: adBudget,
          targetPhoneNumber: targetNumber.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || (data.success !== undefined && !data.success)) {
        throw new Error(data.message || data.error?.message || data.error || `HTTP ${res.status}`);
      }
      setAdLaunched(true);
      onRefreshWorkspace?.();
    } catch (err: any) {
      setAdLaunched(false);
      setAdLaunchError(err?.message || loc('فشل إطلاق الحملة الإعلانية', 'Failed to launch ad campaign'));
    } finally {
      setIsLaunchingAd(false);
    }
  };

  const handleSearchTargeting = async () => {
    setSearchingTargeting(true);
    try {
      const res = await fetch(`/api/v1/ads/targeting?q=${encodeURIComponent(targetingQuery)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setTargetingResults(data.data);
      }
    } catch {
      // ignore
    } finally {
      setSearchingTargeting(false);
    }
  };

  const handleSearchLibrary = async () => {
    setSearchingLibrary(true);
    try {
      const res = await fetch(`/api/v1/ads/library?q=${encodeURIComponent(libraryQuery)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setLibraryResults(data.data);
      }
    } catch {
      // ignore
    } finally {
      setSearchingLibrary(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              {loc('مركز الإعلانات والمتاجر والتحليلات المتقدمة', 'Ads, Commerce & Analytics Engine Hub')}
            </h2>
            <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-600">
              Multi-Network Ads & Commerce
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            {loc(
              'إعلانات انقر للواتساب والاتصال، استكشاف الاستهداف، نماذج جمع العملاء، خريطة الـ SLA الحرارية، والمتجر الموحد',
              'Click-to-WhatsApp & Call ad builder, competitor ad spy library, SLA heatmaps, and unified commerce'
            )}
          </p>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
        {[
          { id: 'ads_builder', label: loc('مُنشئ الإعلانات المباشرة (CTWA & Call)', 'Direct Ads Builder'), icon: Megaphone },
          { id: 'audiences', label: loc('الجمهور واستكشاف الاستهداف', 'Targeting Discovery'), icon: Target },
          { id: 'lead_forms', label: loc('نماذج جمع العملاء (Lead Gen)', 'Instant Lead Forms'), icon: Layers },
          { id: 'pixels', label: loc('بكسل التتبع وCAPI (Pixels)', 'Pixels & CAPI Tags'), icon: Sparkles },
          { id: 'ad_library', label: loc('مكتبة إعلانات المنافسين (Ad Spy)', 'Competitor Ad Library'), icon: Search },
          { id: 'analytics_heatmaps', label: loc('تحليلات الذروة والـ SLA (Heatmaps)', 'Peak Times & Heatmaps'), icon: BarChart3 },
          { id: 'commerce', label: loc('المنتجات والطلبات والخصومات', 'Commerce Products & Orders'), icon: ShoppingBag },
          { id: 'gbp_services', label: loc('خدمات خرائط جوجل (GBP Menu)', 'Google Business Services'), icon: Store },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                active
                  ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-PANEL 1: CTWA & Call Ad Builder */}
      {activeSubTab === 'ads_builder' && (
        <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-5 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {loc('إطلاق حملة إعلانية ممولة سريعة (Direct Response Ad)', 'Direct Response Lead Ad Campaign')}
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                {loc('اختر الهدف: توجيه العميل لمحادثة واتساب أو بدء مكالمة هاتفية فورية', 'Choose between Click-to-WhatsApp or Click-to-Call direct connect')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setAdObjective('ctwa')}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold transition cursor-pointer ${
                  adObjective === 'ctwa' ? 'bg-emerald-600 text-white' : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                }`}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>Click-to-WhatsApp</span>
              </button>
              <button
                onClick={() => setAdObjective('call')}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold transition cursor-pointer ${
                  adObjective === 'call' ? 'bg-blue-600 text-white' : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                }`}
              >
                <Phone className="h-3.5 w-3.5" />
                <span>Click-to-Call</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                {loc('اسم الحملة الإعلانية', 'Campaign Name')}
              </label>
              <input
                type="text"
                value={adName}
                onChange={(e) => setAdName(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                {loc('عنوان الإعلان الرئيسي (Headline)', 'Ad Headline')}
              </label>
              <input
                type="text"
                value={adHeadline}
                onChange={(e) => setAdHeadline(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs text-[var(--text-primary)]"
              />
            </div>
          </div>

          {/* Daily Budget Slider */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[var(--text-primary)]">{loc('الميزانية اليومية:', 'Daily Budget:')}</span>
              <span className="font-mono text-base font-black text-emerald-600">${adBudget} USD</span>
            </div>
            <input
              type="range"
              min={10}
              max={250}
              step={5}
              value={adBudget}
              onChange={(e) => setAdBudget(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
            {adLaunched && (
              <span className="text-xs font-bold text-emerald-600">
                ✓ {loc('تم إطلاق الإعلان بنجاح في Meta Ads Manager!', 'Campaign Active in Meta Ads Manager!')}
              </span>
            )}
            {adLaunchError && (
              <span className="text-xs font-bold text-rose-600">
                ✗ {adLaunchError}
              </span>
            )}
            <button
              onClick={handleLaunchAd}
              disabled={isLaunchingAd}
              className="ms-auto inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition cursor-pointer"
            >
              {isLaunchingAd && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{loc('🚀 إطلاق الحملة الإعلانية', '🚀 Launch Ad Campaign')}</span>
            </button>
          </div>
        </div>
      )}

      {/* SUB-PANEL 2: Audiences & Targeting Discovery */}
      {activeSubTab === 'audiences' && (
        <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-4 shadow-2xs">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              {loc('أداة اكتشاف اهتمامات وكلمات الاستهداف الإعلاني', 'Audience & Targeting Keyword Discovery')}
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              {loc('ابحث عن شرائح الجمهور والاهتمامات الدقيقة لتقليل تكلفة الاكتساب', 'Discover granular audience segments and interest clusters')}
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={targetingQuery}
              onChange={(e) => setTargetingQuery(e.target.value)}
              placeholder="Search interest keywords e.g. E-Commerce, Retail, SaaS"
              className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs text-[var(--text-primary)]"
            />
            <button
              onClick={handleSearchTargeting}
              disabled={searchingTargeting}
              className="rounded-xl bg-[var(--accent-primary)] px-5 py-2 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition"
            >
              {loc('بحث', 'Search')}
            </button>
          </div>

          {targetingResults.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 p-8 text-center">
              <Target className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2" />
              <span className="text-xs font-bold text-[var(--text-primary)] block">
                {loc('استكشف شرائح الجمهور والاهتمامات الإعلانية', 'Discover Granular Audience Interests')}
              </span>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1 max-w-sm mx-auto">
                {loc('أدخل كلمة مفتاحية (مثل: تجارة إلكترونية، عقارات، برمجيات) لحساب حجم الجمهور المقدر.', 'Enter any keyword above to calculate estimated reach and demographic clusters.')}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {targetingResults.map((t) => (
                <div key={t.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[var(--text-primary)]">{t.name}</span>
                    <span className="text-[10px] text-[var(--text-muted)] block">{t.category}</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-600 rounded bg-emerald-500/10 px-2.5 py-0.5 text-[11px]">
                    {t.audienceSize}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-PANEL 3: Instant Lead Gen Forms & Leads */}
      {activeSubTab === 'lead_forms' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-3">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              {loc('نماذج جمع العملاء الفورية (Instant Lead Forms)', 'Instant Lead Generation Forms')}
            </h3>
            {leadForms.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-6 text-center">
                <Layers className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2" />
                <span className="text-xs font-bold text-[var(--text-primary)] block">
                  {loc('لا توجد نماذج فورية لجمع العملاء بعد', 'No Instant Lead Forms Yet')}
                </span>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1 max-w-sm mx-auto">
                  {loc('أنشئ نموذجاً مخصصاً لجمع بيانات واهتمامات العملاء مباشرة من إعلاناتك.', 'Create customized forms to capture names, emails, and phone numbers directly from ads.')}
                </p>
                <button
                  onClick={() => onRefreshWorkspace?.()}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-4 py-1.5 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition cursor-pointer shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{loc('إنشاء نموذج جديد', '+ Create Lead Form')}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {leadForms.map((f) => (
                  <div key={f.id} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 p-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">{f.name}</h4>
                      <span className="text-[10px] text-[var(--text-muted)]">{f.leadsCount} submissions</span>
                    </div>
                    <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                      {f.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden shadow-2xs">
            <div className="px-6 py-4 border-b border-[var(--border-subtle)] font-bold text-xs">
              {loc('العملاء المسجلون مؤخراً عبر النماذج', 'Recent Lead Submissions')}
            </div>
            {submittedLeads.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-primary)] mb-2">
                  <Users className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-[var(--text-primary)] block">
                  {loc('لا توجد بيانات عملاء مسجلة بعد', 'No Lead Submissions Recorded Yet')}
                </span>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1 max-w-sm">
                  {loc('ستظهر بيانات العملاء المسجلين عبر نماذج الإعلانات الفورية فور إرسالهم للنماذج.', 'Customer responses submitted through instant ad forms will automatically appear here.')}
                </p>
              </div>
            ) : (
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 text-[11px] text-[var(--text-muted)] font-bold">
                    <th className="px-6 py-3 text-start">Lead Name</th>
                    <th className="px-4 py-3 text-start">Email</th>
                    <th className="px-4 py-3 text-start">Phone</th>
                    <th className="px-6 py-3 text-end">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {submittedLeads.map((l) => (
                    <tr key={l.id}>
                      <td className="px-6 py-3 font-bold text-[var(--text-primary)]">{l.name}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{l.email}</td>
                      <td className="px-4 py-3 font-mono text-[var(--text-primary)]">{l.phone}</td>
                      <td className="px-6 py-3 text-end text-[var(--text-muted)]">{l.submittedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* SUB-PANEL 4: Pixels & Tracking Tags */}
      {activeSubTab === 'pixels' && (
        <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            {loc('بكسل التتبع وواجهات التحويل CAPI', 'Tracking Pixels & Conversions API')}
          </h3>
          {pixels.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-8 text-center">
              <Sparkles className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2" />
              <span className="text-xs font-bold text-[var(--text-primary)] block">
                {loc('لم يتم ربط أي بكسل تتبع بعد', 'No Tracking Pixels Connected')}
              </span>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1 max-w-sm mx-auto">
                {loc('اربط Meta Pixel أو Google Tag (gtag.js) أو TikTok Pixel لتتبع التحويلات وعائد الإنفاق.', 'Connect Meta Pixel, Google Tag, or TikTok Pixel to track server-side CAPI conversions.')}
              </p>
              <button
                onClick={() => onRefreshWorkspace?.()}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-4 py-1.5 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition cursor-pointer shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{loc('ربط بكسل تتبع', '+ Add Pixel')}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {pixels.map((px) => (
                <div key={px.id} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 p-4 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-[var(--text-primary)]">{px.name}</span>
                    <span className="font-mono text-[11px] text-[var(--text-muted)] block">ID: {px.tagId}</span>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
                    {px.status} (Verified)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-PANEL 5: Competitor Ad Library Spy Search */}
      {activeSubTab === 'ad_library' && (
        <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              {loc('مكتبة استكشاف إعلانات المنافسين (Competitor Ad Spy Library)', 'Competitor Ad Library Explorer')}
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              {loc('ابحث في إعلانات المنافسين النشطة عبر فيسبوك وإنستغرام ولينكد إن', 'Search live active ads in the Meta & LinkedIn Ad Libraries')}
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={libraryQuery}
              onChange={(e) => setLibraryQuery(e.target.value)}
              placeholder="Search brand or product keyword..."
              className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs text-[var(--text-primary)]"
            />
            <button
              onClick={handleSearchLibrary}
              disabled={searchingLibrary}
              className="rounded-xl bg-[var(--accent-primary)] px-5 py-2 text-xs font-bold text-white hover:bg-[var(--accent-hover)]"
            >
              {loc('استكشاف', 'Explore')}
            </button>
          </div>

          {libraryResults.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-8 text-center">
              <Search className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2" />
              <span className="text-xs font-bold text-[var(--text-primary)] block">
                {loc('ابحث في إعلانات المنافسين النشطة', 'Search Competitor Ad Libraries')}
              </span>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1 max-w-sm mx-auto">
                {loc('ابحث عن أي علامة تجارية لاستعراض إعلاناتهم الحية على فيسبوك وإنستغرام ولينكد إن.', 'Look up any brand or product to inspect their active copy, visuals, and platforms.')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {libraryResults.map((ad) => (
                <div key={ad.id} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[var(--text-primary)]">{ad.pageName}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{ad.startDate}</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{ad.text}</p>
                  <div className="flex gap-1.5 pt-2">
                    {ad.platforms.map((p: string) => (
                      <span key={p} className="rounded bg-[var(--bg-card)] px-2 py-0.5 text-[9px] font-mono uppercase text-[var(--text-muted)] border border-[var(--border-subtle)]">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-PANEL 6: Peak Times & Heatmaps */}
      {activeSubTab === 'analytics_heatmaps' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              {loc('أفضل أوقات النشر المتوقعة (Best Time to Post Insights)', 'Best Time to Post Intelligence')}
            </h3>
            {bestTimesSlots.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-8 text-center">
                <BarChart3 className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2" />
                <span className="text-xs font-bold text-[var(--text-primary)] block">
                  {loc('بيانات الذروة التحليلية قيد التجميع', 'Peak Posting Intelligence Generating')}
                </span>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1 max-w-sm mx-auto">
                  {loc('قم بنشر المنشورات والتفاعل مع العملاء لإنتاج توصيات دقيقة لأفضل ساعات النشر.', 'Publish scheduled posts to let AI determine the highest engagement windows for your audience.')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {bestTimesSlots.map((s, idx) => (
                  <div key={idx} className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-start">
                    <span className="text-xs font-bold text-amber-700">{s.dayName} at {s.time}</span>
                    <div className="font-mono text-base font-black text-[var(--text-primary)] mt-1">
                      {s.multiplier}
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)]">Confidence Score: {s.score}/100</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-PANEL 7: Commerce Products, Orders & Discounts */}
      {activeSubTab === 'commerce' && (
        <div className="space-y-5">
          {products.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-[var(--border-subtle)] p-8 text-center bg-[var(--bg-card)]">
              <ShoppingBag className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2" />
              <span className="text-xs font-bold text-[var(--text-primary)] block">
                {loc('لا توجد منتجات مضافة للكتالوج بعد', 'No Commerce Products Listed Yet')}
              </span>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1 max-w-sm mx-auto">
                {loc('أضف منتجاتك أو خدماتك لتتمكن من مشاركتها في محادثات واتساب وإرسال روابط الدفع.', 'Add catalog items to sell directly through WhatsApp chats and social storefronts.')}
              </p>
              <button
                onClick={() => onRefreshWorkspace?.()}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition cursor-pointer shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{loc('إضافة منتج جديد', '+ Add Product')}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {products.map((p) => (
                <div key={p.id} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-2xs">
                  <span className="text-xs font-bold text-[var(--text-primary)]">{p.title}</span>
                  <div className="font-mono text-base font-black text-emerald-600 mt-1">
                    ${p.price.toFixed(2)} {p.currency}
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] block mt-1">In Stock: {p.stock} units</span>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 space-y-3">
            <span className="text-xs font-bold text-[var(--text-primary)]">{loc('أكواد الخصم الترويجية النشطة', 'Active Promo Discounts')}</span>
            {discounts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-6 text-center flex flex-col items-center justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-primary)] mb-2">
                  <Tag className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-[var(--text-primary)] block">
                  {loc('لا توجد أكواد خصم ترويجية نشطة حالياً', 'No Active Promo Discount Codes')}
                </span>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1 max-w-sm">
                  {loc('أنشئ أكواد خصم ترويجية لمشاركتها في حملاتك التسويقية ورسائل المحادثات.', 'Create promotional discount codes to share across marketing campaigns and chat conversations.')}
                </p>
                <button
                  onClick={() => onRefreshWorkspace?.()}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-4 py-1.5 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition cursor-pointer shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{loc('إنشاء كود خصم', '+ Create Discount Code')}</span>
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                {discounts.map((d) => (
                  <div key={d.code} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-1.5 text-xs font-mono">
                    <strong>{d.code}</strong>: {d.value}% Off ({d.usageCount} uses)
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-PANEL 8: Google Business Services Menu */}
      {activeSubTab === 'gbp_services' && (
        <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              {loc('قائمة خدمات ملف Google Business المحلي', 'Google Business Profile Services')}
            </h3>
            <button className="rounded-xl bg-[var(--accent-primary)] px-3.5 py-1.5 text-xs font-bold text-white">
              + Add Service
            </button>
          </div>

          {gbpServices.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-2xl">
              <Store className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2" />
              <span className="font-bold text-[var(--text-primary)] block">
                {loc('قائمة خدمات ملف Google Business فارغة', 'No Google Business Profile Services Added')}
              </span>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1 max-w-sm mx-auto">
                {loc('أضف خدماتك وأسعارها لتظهر مباشرة للمستخدمين في نتائج بحث وخرائط جوجل.', 'List your local services and prices to display directly on Google Maps.')}
              </p>
              <button
                onClick={() => onRefreshWorkspace?.()}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-4 py-1.5 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition cursor-pointer shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{loc('إضافة خدمة محلية', '+ Add Local Service')}</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {gbpServices.map((s) => (
                <div key={s.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[var(--text-primary)]">{s.name}</span>
                    <span className="text-[10px] text-[var(--text-muted)] block">{s.category}</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-600">{s.price}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
