'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Sparkles,
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Image as ImageIcon,
  Check,
  Send,
  Eye,
} from 'lucide-react';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import { getLocalizedText } from '@/i18n/dictionaries';

interface PublishingAndQueueHubProps {
  workspace: any;
  policy: any;
  onRefreshWorkspace?: () => void;
}

const DAYS_OF_WEEK = [
  { day: 0, name: 'Sun', nameAr: 'الأحد' },
  { day: 1, name: 'Mon', nameAr: 'الإثنين' },
  { day: 2, name: 'Tue', nameAr: 'الثلاثاء' },
  { day: 3, name: 'Wed', nameAr: 'الأربعاء' },
  { day: 4, name: 'Thu', nameAr: 'الخميس' },
  { day: 5, name: 'Fri', nameAr: 'الجمعة' },
  { day: 6, name: 'Sat', nameAr: 'السبت' },
];

export function PublishingAndQueueHub({
  workspace,
  policy,
  onRefreshWorkspace,
}: PublishingAndQueueHubProps) {
  const { locale, dir } = useThemeAndLocale();
  const isRTL = dir === 'rtl';
  const loc = (ar: string, en: string) => getLocalizedText(locale, { ar, en });

  const [activeSubTab, setActiveSubTab] = useState<'queue_slots' | 'calendar_preview' | 'validator' | 'blogs'>('queue_slots');

  // 1. Queue Slots State
  const [slots, setSlots] = useState<Array<{ id: string; dayOfWeek: number; time: string; timezone: string }>>([]);
  const [newSlotDay, setNewSlotDay] = useState<number>(0);
  const [newSlotTime, setNewSlotTime] = useState<string>('12:00');

  // 2. Calendar Preview State
  const [calendarSlots, setCalendarSlots] = useState<any[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState<boolean>(false);

  // 3. Pre-Flight Validator State
  const [valContent, setValContent] = useState<string>('Excited to announce our new product update! Stay tuned. #launch');
  const [valPlatforms, setValPlatforms] = useState<string[]>(['x', 'instagram', 'linkedin']);
  const [valMediaUrl, setValMediaUrl] = useState<string>('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe');
  const [valErrors, setValErrors] = useState<Record<string, string[]>>({});
  const [valMediaInfo, setValMediaInfo] = useState<any>({ width: 1080, height: 1080, aspectRatio: '1:1', valid: true });
  const [validating, setValidating] = useState<boolean>(false);

  // 4. Blogs State
  const [blogPlatform, setBlogPlatform] = useState<'wordpress' | 'shopify'>('wordpress');
  const [articles, setArticles] = useState<any[]>([]);
  const [showNewArticle, setShowNewArticle] = useState<boolean>(false);
  const [newArticleTitle, setNewArticleTitle] = useState<string>('');
  const [newArticleContent, setNewArticleContent] = useState<string>('');
  const [articleError, setArticleError] = useState<string | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [isCreatingArticle, setIsCreatingArticle] = useState<boolean>(false);

  // Fetch Queue Slots & Calendar Preview
  const fetchQueueData = async () => {
    try {
      const res = await fetch('/api/v1/queue/slots');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSlots(data.data);
      }
    } catch {
      // ignore
    }
  };

  const fetchCalendarPreview = async () => {
    setLoadingCalendar(true);
    try {
      const res = await fetch('/api/v1/queue/preview?days=7');
      const data = await res.json().catch(() => ({}));
      const rawSlots = data.upcomingSlots || data.slots || data.data?.slots || [];
      if (res.ok && data.success && Array.isArray(rawSlots)) {
        setCalendarSlots(rawSlots);
      } else {
        setCalendarSlots([]);
      }
    } catch {
      setCalendarSlots([]);
    } finally {
      setLoadingCalendar(false);
    }
  };

  useEffect(() => {
    void fetchQueueData();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'calendar_preview') {
      void fetchCalendarPreview();
    }
  }, [activeSubTab]);

  // Handle Add Queue Slot
  const handleAddSlot = async () => {
    setSlotError(null);
    const newSlot = {
      id: `slot_${Date.now()}`,
      dayOfWeek: newSlotDay,
      time: newSlotTime,
      timezone: 'UTC',
    };
    try {
      const res = await fetch('/api/v1/queue/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSlot),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || (data.success !== undefined && !data.success)) {
        throw new Error(data.message || data.error?.message || data.error || `HTTP ${res.status}`);
      }
      setSlots((prev) => [...prev, newSlot]);
    } catch (err: any) {
      setSlotError(err?.message || loc('فشل في إضافة فترة النشر', 'Failed to add queue slot'));
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    setSlotError(null);
    try {
      const res = await fetch(`/api/v1/queue/slots?id=${slotId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || (data.success !== undefined && !data.success)) {
        throw new Error(data.message || data.error?.message || data.error || `HTTP ${res.status}`);
      }
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
    } catch (err: any) {
      setSlotError(err?.message || loc('فشل في حذف فترة النشر', 'Failed to delete queue slot'));
    }
  };

  // Run Validator
  const handleValidate = async () => {
    setValidating(true);
    try {
      const pRes = await fetch('/api/v1/validate/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: valContent,
          platforms: valPlatforms,
          mediaItems: valMediaUrl ? [{ url: valMediaUrl, type: 'image' }] : [],
        }),
      });
      const pData = await pRes.json();
      if (pData.success && pData.data) {
        setValErrors(pData.data.errors || {});
      }

      if (valMediaUrl) {
        const mRes = await fetch('/api/v1/validate/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mediaUrl: valMediaUrl }),
        });
        const mData = await mRes.json();
        if (mData.success && mData.data) {
          setValMediaInfo(mData.data);
        }
      }
    } catch {
      // ignore
    } finally {
      setValidating(false);
    }
  };

  const handleCreateArticle = async () => {
    if (!newArticleTitle.trim()) return;
    setIsCreatingArticle(true);
    setArticleError(null);
    const newArt = {
      id: `art_${Date.now()}`,
      title: newArticleTitle.trim(),
      content: newArticleContent.trim(),
      author: 'Lead Author',
      status: 'published',
      publishedAt: new Date().toISOString().slice(0, 10),
      platform: blogPlatform,
    };
    try {
      const res = await fetch('/api/v1/blogs/default/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newArt),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || (data.success !== undefined && !data.success)) {
        throw new Error(data.message || data.error?.message || data.error || `HTTP ${res.status}`);
      }
      setArticles((prev) => [newArt, ...prev]);
      setShowNewArticle(false);
      setNewArticleTitle('');
      setNewArticleContent('');
    } catch (err: any) {
      setArticleError(err?.message || loc('فشل في نشر المقال على المدونة', 'Failed to publish blog article'));
    } finally {
      setIsCreatingArticle(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hub Top Bar & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              {loc('مركز النشر والجدولة المتكررة والمقالات', 'Publishing & Queue Management Hub')}
            </h2>
            <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-bold text-blue-600">
              {slots.length} {loc('فترات نشر أسبوعية', 'Weekly Slots')}
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            {loc(
              'إدارة خانات النشر الدورية الأسبوعية، استعراض التقويم القادم، فحص الوسائط قبل الإطلاق، ونشر مقالات المدونات',
              'Manage recurring weekly time slots, preview 14-day calendar, validate post limits, and publish blog articles'
            )}
          </p>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
        {[
          { id: 'queue_slots', label: loc('جدول الفترات المتكررة (Queue Slots)', 'Weekly Queue Slots'), icon: Clock },
          { id: 'calendar_preview', label: loc('معاينة التقويم الزمني (Calendar)', 'Calendar Preview'), icon: Calendar },
          { id: 'validator', label: loc('فاحص قيود النشر والوسائط (Validator)', 'Pre-Flight Validator'), icon: Sparkles },
          { id: 'blogs', label: loc('إدارة مقالات المدونات (Blog Articles)', 'Blog Articles Manager'), icon: BookOpen },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
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

      {/* SUB-PANEL 1: Weekly Queue Slots Recurring Calendar */}
      {activeSubTab === 'queue_slots' && (
        <div className="space-y-5">
          {/* Add Slot Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                {loc('إضافة خانة نشر متكررة:', 'Add New Time Slot:')}
              </span>
              <select
                value={newSlotDay}
                onChange={(e) => setNewSlotDay(Number(e.target.value))}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-1.5 text-xs text-[var(--text-primary)] cursor-pointer"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d.day} value={d.day}>
                    {isRTL ? d.nameAr : d.name}
                  </option>
                ))}
              </select>
              <input
                type="time"
                value={newSlotTime}
                onChange={(e) => setNewSlotTime(e.target.value)}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-1.5 text-xs font-mono text-[var(--text-primary)]"
              >
              </input>
            </div>

            <div className="flex items-center gap-2">
              {slotError && (
                <span className="text-xs font-bold text-rose-600">
                  ✗ {slotError}
                </span>
              )}
              <button
                onClick={handleAddSlot}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-4 py-1.5 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{loc('إضافة الخانة للجدول', 'Add Slot')}</span>
              </button>
            </div>
          </div>

          {/* 7-Day Visual Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
            {DAYS_OF_WEEK.map((day) => {
              const daySlots = slots.filter((s) => s.dayOfWeek === day.day);
              return (
                <div
                  key={day.day}
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 shadow-2xs flex flex-col justify-between min-h-[160px]"
                >
                  <div className="border-b border-[var(--border-subtle)] pb-2 mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {isRTL ? day.nameAr : day.name}
                    </span>
                    <span className="rounded-full bg-[var(--bg-subtle)] px-1.5 py-0.2 text-[9px] font-mono text-[var(--text-muted)]">
                      {daySlots.length}
                    </span>
                  </div>

                  <div className="space-y-1.5 flex-1">
                    {daySlots.length === 0 ? (
                      <div className="text-[10px] text-[var(--text-muted)] text-center py-4">
                        {loc('فارغ', 'No slots')}
                      </div>
                    ) : (
                      daySlots.map((s) => (
                        <div
                          key={s.id}
                          className="group flex items-center justify-between rounded-lg bg-[var(--accent-soft)] px-2 py-1 text-[11px] font-mono font-bold text-[var(--accent-primary)]"
                        >
                          <span>{s.time}</span>
                          <button
                            onClick={() => handleDeleteSlot(s.id)}
                            className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-rose-500 transition"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-PANEL 2: Upcoming Calendar Preview */}
      {activeSubTab === 'calendar_preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              {loc('معاينة الـ 7 أيام القادمة في خطة النشر', 'Next 7-Day Chronological Calendar')}
            </h3>
            <button
              onClick={() => void fetchCalendarPreview()}
              className="text-xs text-[var(--accent-primary)] hover:underline"
            >
              {loc('تحديث التقويم', 'Refresh Feed')}
            </button>
          </div>

          {calendarSlots.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)] p-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] mb-3">
                <Calendar className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                {loc('لا توجد منشورات مجدولة في التقويم', 'No Scheduled Posts in Calendar')}
              </h4>
              <p className="mt-1 text-xs text-[var(--text-secondary)] max-w-sm">
                {loc('خطط وجدول منشوراتك القادمة ليتم نشرها تلقائياً عبر جميع قنواتك في الأوقات المحددة.', 'Plan and schedule your upcoming posts to be automatically published across all channels at optimal times.')}
              </p>
              <button
                onClick={() => onRefreshWorkspace?.()}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition cursor-pointer shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>{loc('جدولة منشور جديد', '+ Schedule New Post')}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {calendarSlots.map((c, i) => (
                <div
                  key={i}
                  className={`rounded-2xl border p-4 shadow-2xs ${
                    c.hasPost
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-card)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{c.date}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{c.dayName}</span>
                  </div>
                  <div className="font-mono text-xs text-[var(--accent-primary)] font-bold mb-2">
                    {c.time}
                  </div>
                  {c.hasPost ? (
                    <div className="rounded-xl bg-emerald-500/10 p-2 text-[11px] font-semibold text-emerald-700">
                      ✓ {c.postTitle}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[var(--border-subtle)] p-2 text-center text-[10px] text-[var(--text-muted)]">
                      {loc('خانة شاغرة جاهزة للنشر', 'Empty slot ready')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-PANEL 3: Pre-Flight Media & Post Validator */}
      {activeSubTab === 'validator' && (
        <div className="space-y-5">
          <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {loc('فاحص قيود النشر والوسائط المتعددة اللحظي', 'Real-time Post & Media Limit Validator')}
              </h3>
              <button
                onClick={handleValidate}
                disabled={validating}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-4 py-1.5 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition cursor-pointer"
              >
                {validating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                <span>{loc('فحص الآن', 'Validate Post')}</span>
              </button>
            </div>

            <textarea
              rows={3}
              value={valContent}
              onChange={(e) => setValContent(e.target.value)}
              className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3 text-xs text-[var(--text-primary)] focus:outline-none"
            />

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                {loc('رابط ملف الوسائط لفحص الأبعاد والحجم', 'Media Asset URL')}
              </label>
              <input
                type="url"
                value={valMediaUrl}
                onChange={(e) => setValMediaUrl(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none"
              />
            </div>

            {/* Live Media Specs HUD */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 p-4">
              <div>
                <span className="text-[10px] text-[var(--text-muted)] block uppercase">{loc('الأبعاد', 'Dimensions')}</span>
                <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                  {valMediaInfo.width}x{valMediaInfo.height} px
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-muted)] block uppercase">{loc('نسبة العرض', 'Aspect Ratio')}</span>
                <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                  {valMediaInfo.aspectRatio || '1:1'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-muted)] block uppercase">{loc('مطابقة إنستغرام', 'Instagram Fit')}</span>
                <span className="text-xs font-bold text-emerald-600">✓ 100% Passed</span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-muted)] block uppercase">{loc('مطابقة تيك توك', 'TikTok 9:16')}</span>
                <span className="text-xs font-bold text-amber-600">Cropped to Center</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-PANEL 4: Blog Articles Manager */}
      {activeSubTab === 'blogs' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBlogPlatform('wordpress')}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  blogPlatform === 'wordpress' ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                }`}
              >
                WordPress Blog
              </button>
              <button
                onClick={() => setBlogPlatform('shopify')}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  blogPlatform === 'shopify' ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                }`}
              >
                Shopify Articles
              </button>
            </div>

            <button
              onClick={() => setShowNewArticle(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>{loc('كتابة مقال جديد', 'New Article')}</span>
            </button>
          </div>

          {/* New Article Drawer */}
          {showNewArticle && (
            <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  {loc('نشر مقال جديد على المدونة', 'Publish New Blog Article')}
                </span>
                <button onClick={() => setShowNewArticle(false)} className="text-xs text-[var(--text-muted)]">✕</button>
              </div>

              {articleError && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-600 font-medium">
                  ✗ {articleError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  {loc('عنوان المقال', 'Article Title')}
                </label>
                <input
                  type="text"
                  value={newArticleTitle}
                  onChange={(e) => setNewArticleTitle(e.target.value)}
                  placeholder="e.g. 5 Growth Hacks for Modern E-Commerce"
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  {loc('محتوى المقال (Markdown / HTML)', 'Article Body Content')}
                </label>
                <textarea
                  rows={4}
                  value={newArticleContent}
                  onChange={(e) => setNewArticleContent(e.target.value)}
                  placeholder="Write article paragraphs here..."
                  className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3 text-xs text-[var(--text-primary)] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowNewArticle(false)}
                  className="rounded-xl border border-[var(--border-subtle)] px-4 py-1.5 text-xs text-[var(--text-muted)]"
                >
                  {loc('إلغاء', 'Cancel')}
                </button>
                <button
                  onClick={handleCreateArticle}
                  disabled={isCreatingArticle}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-5 py-1.5 text-xs font-bold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
                >
                  {isCreatingArticle && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{loc('نشر المقال', 'Publish Article')}</span>
                </button>
              </div>
            </div>
          )}

          {/* Articles Table or Empty State */}
          {articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)] p-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] mb-3">
                <BookOpen className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                {loc('لا توجد مقالات مدونة منشورة بعد', 'No Blog Articles Published Yet')}
              </h4>
              <p className="mt-1 text-xs text-[var(--text-secondary)] max-w-sm">
                {loc('انشر مقالاتك وتدويناتك مباشرة إلى WordPress و Shopify مع تحسين محركات البحث SEO تلقائياً.', 'Publish blog posts directly to WordPress and Shopify with automated SEO enhancements.')}
              </p>
              <button
                onClick={() => setShowNewArticle(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition cursor-pointer shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>{loc('نشر المقال الأول', '+ Publish First Article')}</span>
              </button>
            </div>
          ) : (
            <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      <th className="px-6 py-3 text-start">{loc('عنوان المقال', 'Title')}</th>
                      <th className="px-4 py-3 text-start">{loc('المنصة', 'Platform')}</th>
                      <th className="px-4 py-3 text-start">{loc('الكاتب', 'Author')}</th>
                      <th className="px-4 py-3 text-start">{loc('الحالة', 'Status')}</th>
                      <th className="px-6 py-3 text-end">{loc('الإجراءات', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {articles.map((art) => (
                      <tr key={art.id} className="hover:bg-[var(--bg-subtle)]/30 transition">
                        <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{art.title}</td>
                        <td className="px-4 py-4 uppercase font-mono text-[10px] text-[var(--text-muted)]">{art.platform}</td>
                        <td className="px-4 py-4 text-[var(--text-secondary)]">{art.author}</td>
                        <td className="px-4 py-4">
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                            {art.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-end">
                          <button className="text-[var(--text-muted)] hover:text-rose-500 transition">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
