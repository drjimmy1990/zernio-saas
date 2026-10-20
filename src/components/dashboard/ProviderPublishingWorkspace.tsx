'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Calendar, RefreshCw, Send, Upload, X } from 'lucide-react';
import { publishingScheduleInstant, publishingWallTime } from '@/lib/publishing/schedule';

interface PublishingAccount { _id: string; platform: string; username?: string; displayName?: string; isActive?: boolean; enabled?: boolean; needsReconnection?: boolean; metadata?: { loginMethod?: string } }
interface PublishingPost { _id: string; content?: string; status?: string; scheduledFor?: string; timezone?: string; queuedFromProfile?: unknown; mediaItems?: PublishingMedia[]; platforms?: { platform: string; accountId?: string | { _id?: string }; status?: string; platformPostUrl?: string; error?: unknown; errorMessage?: string; platformError?: { message?: string }; customContent?: string; customMedia?: unknown; scheduledFor?: string; platformSpecificData?: unknown }[] }
interface PublishingMedia { type: 'image' | 'video'; url: string }
interface PublishingIntent { key: string; scope: string; createdAt?: number; body: Record<string, unknown> }
interface PublishingQuota { quotaUsage: number; quotaTotal: number; quotaDurationSeconds?: number }
interface MediaInspection { width?: number; height?: number; duration?: number; size?: number; contentType?: string }
const storageKey = 'asra3:facebook:pending-intent';
const field = 'w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]';
const secondary = 'rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-sm font-medium hover:bg-[var(--bg-subtle)] disabled:opacity-50';
function publishingHttps(value: string) { try { return new URL(value).protocol === 'https:'; } catch { return false; } }
function editablePost(post: PublishingPost) {
  const target = post.platforms?.[0];
  const settings = target?.platformSpecificData;
  const basicSettings = settings == null || (typeof settings === 'object' && !Array.isArray(settings) &&
    Object.entries(settings).every(([key, value]) => target?.platform === 'instagram' &&
      ((key === 'contentType' && value === 'story') || (key === 'shareToFeed' && typeof value === 'boolean'))));
  return post.platforms?.length === 1 && ['facebook', 'instagram'].includes(target?.platform || '') && !post.queuedFromProfile &&
    target?.customContent == null && target?.customMedia == null && target?.scheduledFor == null &&
    basicSettings && (post.mediaItems || []).every(item => ['image', 'video'].includes(item.type) && Object.keys(item).every(key => ['type', 'url'].includes(key)));
}
function publishingMessages(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(publishingMessages);
  if (value && typeof value === 'object') {
    const message = (value as { message?: unknown; error?: unknown }).message || (value as { error?: unknown }).error;
    return message ? publishingMessages(message) : Object.values(value).flatMap(publishingMessages);
  }
  return [];
}
async function inspectPublishingFile(file: File): Promise<MediaInspection> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise(resolve => {
      const node = file.type.startsWith('video/') ? document.createElement('video') : new Image();
      const finish = () => {
        clearTimeout(timer);
        resolve({ size: file.size, contentType: file.type, ...(node instanceof HTMLVideoElement ?
          { width: node.videoWidth || undefined, height: node.videoHeight || undefined, duration: Number.isFinite(node.duration) ? node.duration : undefined } :
          { width: node.naturalWidth || undefined, height: node.naturalHeight || undefined }) });
      };
      const timer = setTimeout(finish, 5000);
      node.onerror = finish;
      if (node instanceof HTMLVideoElement) { node.preload = 'metadata'; node.onloadedmetadata = finish; } else node.onload = finish;
      node.src = url;
    });
  } finally { URL.revokeObjectURL(url); }
}
async function publishingRequest(action: string, body?: Record<string, unknown>) {
  const response = await fetch(body ? '/api/publishing' : `/api/publishing?action=${action}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...body }) } : { cache: 'no-store' });
  let data;
  try { data = await response.json(); } catch { throw new Error('The server response could not be read.'); }
  return { data, status: response.status, ok: response.ok };
}

export function ProviderPublishingWorkspace({ isRTL = false, onPublished }: { isRTL?: boolean; onPublished?: () => void }) {
  const t = (ar: string, en: string) => isRTL ? ar : en;
  const [accounts, setAccounts] = useState<PublishingAccount[]>([]);
  const [posts, setPosts] = useState<PublishingPost[]>([]);
  const [accountId, setAccountId] = useState('');
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<PublishingMedia[]>([]);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [mode, setMode] = useState<'draft' | 'now' | 'scheduled'>('draft');
  const [scheduledFor, setScheduledFor] = useState('');
  const [timezone, setTimezone] = useState('Africa/Cairo');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, setPending] = useState<PublishingIntent | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [result, setResult] = useState<PublishingPost | null>(null);
  const [outcomeDetails, setOutcomeDetails] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [omittedCount, setOmittedCount] = useState(0);
  const [reviewedPending, setReviewedPending] = useState(false);
  const [story, setStory] = useState(false);
  const [shareToFeed, setShareToFeed] = useState<boolean | undefined>(undefined);
  const [quota, setQuota] = useState<PublishingQuota | null>(null);
  const [quotaError, setQuotaError] = useState('');
  const [checking, setChecking] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [inspections, setInspections] = useState<Record<string, MediaInspection>>({});
  const lock = useRef(false);
  const checkLock = useRef(false);
  const scope = useRef<string | null>(null);
  const revision = useRef(0);
  const refreshRevision = useRef(0);
  const reviewPanel = useRef<HTMLElement | null>(null);
  const pages = accounts.filter(a => ['facebook', 'instagram'].includes(a.platform));
  const selected = pages.find(a => a._id === accountId);
  const instagram = selected?.platform === 'instagram';
  const usable = selected && selected.isActive === true && selected.enabled !== false && !selected.needsReconnection;
  const isReel = instagram && !story && media.length === 1 && media[0]?.type === 'video';
  const platformSpecificData = instagram ? { ...(story ? { contentType: 'story' } : {}), ...(isReel && shareToFeed !== undefined ? { shareToFeed } : {}) } : undefined;
  const captionLength = [...content].length;
  const format = story ? t('قصة', 'Story') : media.length > 1 ? t('منشور متعدد الوسائط', 'Carousel') : media[0]?.type === 'video' ? 'Reel' : t('منشور صورة', 'Feed image');
  const fingerprint = JSON.stringify({ accountId, content, media, mode, scheduledFor, timezone, editingId, story, shareToFeed });
  const currentFingerprint = useRef(fingerprint);
  if (currentFingerprint.current !== fingerprint) { currentFingerprint.current = fingerprint; revision.current += 1; }
  useEffect(() => { setReviewed(false); setValidationWarnings([]); setChecking(false); }, [fingerprint]);
  useEffect(() => { if (!isReel) setShareToFeed(undefined); }, [isReel]);
  useEffect(() => {
    if (reviewed && mode !== 'draft') {
      reviewPanel.current?.focus({ preventScroll: true });
      if (window.matchMedia('(max-width: 1279px)').matches) reviewPanel.current?.scrollIntoView({ block: 'start' });
    }
  }, [reviewed, mode]);
  useEffect(() => {
    let stale = false;
    setQuota(null); setQuotaError('');
    if (instagram && accountId) {
      void publishingRequest(`instagram_limit&accountId=${encodeURIComponent(accountId)}`).then(({ data, ok }) => {
        if (stale) return;
        if (!ok || !Number.isFinite(data.quotaUsage) || !Number.isFinite(data.quotaTotal)) throw new Error(data.error?.message || 'Instagram publishing limit is unavailable.');
        setQuota(data);
      }).catch(failure => { if (!stale) setQuotaError(failure instanceof Error ? failure.message : 'Instagram publishing limit is unavailable.'); });
    }
    return () => { stale = true; };
  }, [accountId, instagram]);
  const canReplayPending = pending?.body.action === 'create' && typeof pending.createdAt === 'number' &&
    Date.now() - pending.createdAt < 24 * 60 * 60 * 1000;
  const refresh = useCallback(async () => {
    const requestRevision = ++refreshRevision.current;
    setLoading(true);
    try {
      const [a, p] = await Promise.all([publishingRequest('accounts'), publishingRequest(`posts&page=${page}&limit=10`)]);
      if (requestRevision !== refreshRevision.current) return;
      if (!a.ok || !Array.isArray(a.data.accounts)) throw new Error(a.data.error?.message || 'Could not load connected Pages.');
      if (typeof a.data.profileId !== 'string' || !a.data.profileId) throw new Error('The workspace identity could not be verified.');
      const verifiedScope = a.data.profileId;
      if (scope.current !== verifiedScope) {
        scope.current = verifiedScope;
        revision.current += 1;
        setPending(null); setReviewedPending(false); setContent(''); setMedia([]); setAccountId(''); setEditingId(null); setResult(null); setOutcomeDetails([]); setNotice(''); setMode('draft'); setScheduledFor(''); setStory(false); setShareToFeed(undefined); setInspections({}); setReviewed(false); setValidationWarnings([]); setBusy(false);
        try {
          const stored = sessionStorage.getItem(`${storageKey}:${verifiedScope}`);
          if (stored) { const intent = JSON.parse(stored); if (intent.scope === verifiedScope && intent.key && intent.body) setPending(intent); }
        } catch { /* Storage can be disabled. */ }
      }
      setAccounts(a.data.accounts);
      if (!p.ok || !Array.isArray(p.data.posts)) throw new Error(p.data.error?.message || 'Could not load posts.');
      setPosts(p.data.posts);
      setOmittedCount(Number(p.data.omittedCount) || 0);
      setHasMore(p.data.pagination?.hasNextPage === true || p.data.pagination?.hasMore === true || Number(p.data.pagination?.pages ?? p.data.pagination?.totalPages) > page);
    } catch (e) { if (requestRevision === refreshRevision.current) { revision.current += 1; scope.current = null; setAccounts([]); setPosts([]); setPending(null); setResult(null); setOutcomeDetails([]); setReviewedPending(false); setBusy(false); setError(e instanceof Error ? e.message : 'Could not refresh publishing.'); } }
    finally { if (requestRevision === refreshRevision.current) setLoading(false); }
  }, [page]);
  useEffect(() => { void refresh(); }, [refresh]);
  function saveIntent(intent: PublishingIntent | null) {
    setPending(intent);
    if (!scope.current) return;
    try { if (intent) sessionStorage.setItem(`${storageKey}:${scope.current}`, JSON.stringify(intent)); else sessionStorage.removeItem(`${storageKey}:${scope.current}`); } catch { /* The current mounted composer still keeps the key. */ }
  }
  async function checkComposer() {
    if (checkLock.current || checking || busy || pending) return false;
    const requestRevision = revision.current;
    const requestScope = scope.current;
    setError(''); setReviewed(false); setValidationWarnings([]);
    if (!usable || !requestScope) { setError(t('اختر حساباً متصلاً ومفعلاً للنشر.', 'Choose a connected account enabled for publishing.')); return false; }
    if (!content.trim() && media.length === 0) { setError(t('أضف نصاً أو وسائط.', 'Add text or media.')); return false; }
    if (instagram && (media.length === 0 || media.length > 20 || (story && media.length !== 1))) { setError(t('يتطلب Instagram وسائط: ملف واحد للقصة، وحتى ٢٠ ملفاً للمنشور المتعدد.', 'Instagram requires media: one item for a Story, and up to 20 for a carousel.')); return false; }
    if (instagram && captionLength > 2200) { setError(t('اختصر النص إلى ٢٢٠٠ حرف أو أقل.', 'Shorten the caption to 2,200 characters or fewer.')); return false; }
    if (mode === 'scheduled') {
      try { if (Date.parse(publishingScheduleInstant(scheduledFor, timezone)) <= Date.now()) throw new Error(t('اختر موعداً في المستقبل.', 'Choose a publishing time in the future.')); }
      catch (failure) { setError(failure instanceof Error ? failure.message : 'Choose a valid publishing time.'); return false; }
    }
    checkLock.current = true; setChecking(true);
    try {
      if (instagram) {
        const [validation, ...checks] = await Promise.all([
          publishingRequest('validate_post', { content, mediaItems: media, platforms: [{ platform: 'instagram', accountId, platformSpecificData }] }),
          ...media.map(item => publishingRequest('validate_media', { accountId, url: item.url })),
          ...(mode === 'now' ? [publishingRequest(`instagram_limit&accountId=${encodeURIComponent(accountId)}`)] : []),
        ]);
        if (revision.current !== requestRevision || scope.current !== requestScope) return false;
        const messages = publishingMessages(validation.data.errors);
        if (!validation.ok || validation.data.valid !== true) throw new Error(messages.join(' ') || validation.data.error?.message || t('تعذر التحقق من المنشور.', 'The post could not be validated.'));
        const warnings = publishingMessages(validation.data.warnings);
        for (const [index, check] of checks.entries()) {
          if (index >= media.length) {
            if (!check.ok || !Number.isFinite(check.data.quotaUsage) || !Number.isFinite(check.data.quotaTotal)) throw new Error(check.data.error?.message || 'Instagram publishing limit could not be checked.');
            setQuota(check.data);
            if (check.data.quotaUsage >= check.data.quotaTotal) throw new Error(t('وصل هذا الحساب إلى حد النشر الحالي. احفظ مسودة أو اختر موعداً لاحقاً.', 'This account has reached its current publishing limit. Save a draft or schedule for later.'));
            continue;
          }
          if (!check.ok || check.data.valid !== true) throw new Error(check.data.error?.message || check.data.error || `Media ${index + 1} could not be validated.`);
          if (check.data.type && check.data.type !== media[index].type) throw new Error(t('نوع الوسائط لا يطابق الملف. صحح نوع الصورة أو الفيديو.', 'The media type does not match the file. Correct the image or video type.'));
          if (check.data.platformLimits?.instagram?.withinLimit === false) warnings.push(t('الملف يتجاوز الحجم المفضل؛ قد تضغطه الخدمة.', 'The file exceeds the preferred size; the service may compress it.'));
          if (check.data.size == null) warnings.push(t('حجم أحد الملفات غير معروف. لم يتم تأكيد حد الحجم.', 'A media file has unknown size. Its size limit has not been confirmed.'));
        }
        if (media.some(item => !inspections[item.url]?.width || (item.type === 'video' && inspections[item.url]?.duration == null))) warnings.push(t('لم يتم التحقق من أبعاد الوسائط أو مدة الفيديو. تأكد من ملاءمتها قبل الإرسال.', 'Media dimensions or video duration are unverified. Check their suitability before sending.'));
        for (const item of media) {
          const measured = inspections[item.url];
          if (item.type === 'image' && measured?.size && measured.size > 8 * 1024 ** 2) warnings.push(t('الصورة أكبر من ٨ ميجابايت؛ قد تضغطها الخدمة.', 'The image is over 8MB; the service may compress it.'));
          if (!story && measured?.width && measured.height && (measured.width / measured.height < 0.5625 || measured.width / measured.height > 1.91)) warnings.push(t('نسبة أبعاد الملف خارج نطاق منشورات Instagram الموثق. راجع القص.', 'The measured aspect ratio is outside the documented Instagram feed range. Review the crop.'));
          if (item.type === 'video' && measured?.duration != null && (measured.duration < 3 || measured.duration > (story ? 60 : media.length === 1 ? 90 : 3600))) warnings.push(t('مدة الفيديو خارج الإرشادات الحالية. راجع ملف الفيديو قبل الإرسال.', 'The measured video duration is outside the current guidance. Review the video before sending.'));
        }
        setValidationWarnings([...new Set(warnings)]);
      }
      if (revision.current !== requestRevision || scope.current !== requestScope) return false;
      setReviewed(true); return true;
    } catch (failure) { if (revision.current === requestRevision && scope.current === requestScope) setError(failure instanceof Error ? failure.message : 'Validation could not be completed.'); return false; }
    finally { checkLock.current = false; if (revision.current === requestRevision) setChecking(false); }
  }
  async function submit(intent?: PublishingIntent) {
    if (lock.current) return;
    setError(''); setNotice('');
    const retrying = intent || pending;
    const replayingUncertainCreate = !!pending && !intent && pending.body.action === 'create';
    const submitFingerprint = currentFingerprint.current;
    if (pending && !intent && (pending.body.action !== 'create' || typeof pending.createdAt !== 'number' ||
      Date.now() - pending.createdAt >= 24 * 60 * 60 * 1000)) {
      setError(t('راجع نتيجة المنشور قبل إجراء تغيير آخر.', 'Review the post outcome before another change.')); return;
    }
    if (!scope.current || (retrying && retrying.scope !== scope.current)) { setError(t('تعذر التحقق من هوية مساحة العمل. حدّث الصفحة أولاً.', 'The workspace identity could not be verified. Refresh first.')); return; }
    if (!retrying && (!usable || (!content.trim() && media.length === 0))) { setError(t('اختر حساباً متصلاً وأضف نصاً أو وسائط.', 'Choose a connected account and add text or media.')); return; }
    if (!retrying && mode !== 'draft' && !reviewed) { await checkComposer(); return; }
    if (!retrying && instagram && mode === 'draft' && !await checkComposer()) return;
    if (!retrying && submitFingerprint !== currentFingerprint.current) return;
    if (!retrying && mode === 'scheduled' && (!scheduledFor || !timezone.trim())) { setError(t('حدد موعد النشر والمنطقة الزمنية.', 'Enter a publishing time and timezone.')); return; }
    let scheduledInstant: string | undefined;
    if (!retrying && mode === 'scheduled') {
      try { scheduledInstant = publishingScheduleInstant(scheduledFor, timezone); }
      catch (failure) { setError(failure instanceof Error ? failure.message : 'Choose a valid publishing time.'); return; }
    }
    const next = retrying || { key: crypto.randomUUID(), scope: scope.current, createdAt: Date.now(), body: { action: editingId ? 'update' : 'create', ...(editingId ? { postId: editingId } : {}), content, platforms: [{ platform: selected!.platform, accountId, ...(instagram ? { platformSpecificData } : {}) }], mediaItems: media, ...(mode === 'now' ? { publishNow: true } : mode === 'draft' ? { isDraft: true } : { scheduledFor: scheduledInstant, timezone }) } };
    // Only creation has documented 24-hour replay protection; other uncertain writes need review.
    setReviewedPending(false);
    saveIntent(next); lock.current = true; setBusy(true);
    try {
      const { data, ok, status } = await publishingRequest(String(next.body.action), { ...next.body, idempotencyKey: next.key });
      if (scope.current !== next.scope) return;
      if (!ok) {
        if (!replayingUncertainCreate && status < 500 && status !== 408 && status !== 429 && !(status === 409 && data.error?.code === 'idempotency_conflict')) saveIntent(null);
        throw new Error(data.error?.message || `Request failed (${status}).`);
      }
      if (!data.post?._id) throw new Error(t('لم يتم تأكيد نتيجة الطلب. أعد التحقق بنفس الطلب.', 'The result is unconfirmed. Check again using the same request.'));
      setResult(data.post); saveIntent(null); setEditingId(null);
      setOutcomeDetails([...publishingMessages(data.error), ...publishingMessages(data.warnings), ...(Array.isArray(data.platformResults) ? data.platformResults.flatMap((channel: { platform?: string; status?: string; error?: unknown; errorMessage?: unknown; warnings?: unknown }) => {
        const details = [...publishingMessages(channel.error), ...publishingMessages(channel.errorMessage), ...publishingMessages(channel.warnings)];
        return details.map(detail => `${channel.platform || t('قناة', 'Channel')}${channel.status ? ` · ${channel.status}` : ''}: ${detail}`);
      }) : [])]);
      setNotice(status === 207 || data.httpStatus === 207 ? t('لم يكتمل النشر. راجع نتيجة كل قناة أدناه.', 'Publishing did not fully complete. Review each channel result below.') + (data.error?.message ? ` ${data.error.message}` : '') : t('تم استلام نتيجة الطلب. الحالة الفعلية موضحة أدناه.', 'Request completed. The actual post status is shown below.'));
      setContent(''); setMedia([]); setStory(false); setShareToFeed(undefined); setReviewed(false); await refresh(); onPublished?.();
    } catch (e) { setError(e instanceof Error ? e.message : 'The result is unconfirmed.'); }
    finally { setBusy(false); lock.current = false; }
  }
  async function reviewPendingPost() {
    if (!pending || busy) return;
    const requestScope = scope.current;
    const requestRevision = revision.current;
    const requestRefresh = refreshRevision.current;
    const stillCurrent = () => scope.current === requestScope && pending.scope === requestScope && revision.current === requestRevision && refreshRevision.current === requestRefresh;
    setBusy(true); setError(''); setReviewedPending(false);
    try {
      let reviewedPost: PublishingPost | undefined;
      if (pending.body.postId) {
        const { data, ok } = await publishingRequest(`post&postId=${encodeURIComponent(String(pending.body.postId))}`);
        if (!stillCurrent()) return;
        if (!ok || !data.post?._id) throw new Error(data.error?.message || 'The post could not be verified.');
        reviewedPost = data.post;
      }
      if (!stillCurrent()) return;
      await refresh();
      if (scope.current === requestScope && pending.scope === requestScope && revision.current === requestRevision && refreshRevision.current === requestRefresh + 1) {
        if (reviewedPost) { setResult(reviewedPost); setOutcomeDetails([]); }
        setReviewedPending(true);
      }
    } catch (failure) { if (scope.current === requestScope && revision.current === requestRevision) setError(failure instanceof Error ? failure.message : 'The result could not be reviewed.'); }
    finally { if (scope.current === requestScope && revision.current === requestRevision) setBusy(false); }
  }
  async function upload(file?: File) {
    if (!file || busy || pending) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) { setError(t('اختر صورة أو فيديو.', 'Choose an image or video.')); return; }
    if (instagram && !['image/jpeg', 'image/png', 'video/mp4', 'video/quicktime'].includes(file.type)) { setError(t('لـ Instagram، اختر صورة JPEG أو PNG، أو فيديو MP4 أو MOV.', 'For Instagram, choose a JPEG or PNG image, or an MP4 or MOV video.')); return; }
    if (file.size < 1 || file.size > 5 * 1024 ** 3) { setError(t('اختر ملفاً بحجم أكبر من صفر وحتى ٥ جيجابايت.', 'Choose a file larger than zero and up to 5GB.')); return; }
    const requestRevision = revision.current;
    const requestScope = scope.current;
    setBusy(true); setError('');
    try {
      const inspection = await inspectPublishingFile(file);
      if (requestRevision !== revision.current || requestScope !== scope.current) return;
      const { data, ok } = await publishingRequest('presign', { filename: file.name, contentType: file.type, size: file.size });
      if (!ok || !publishingHttps(data.uploadUrl) || !publishingHttps(data.publicUrl)) throw new Error(data.error?.message || 'Upload could not be prepared.');
      if (data.provider === 'simulated-cdn') throw new Error('A real media upload service is required.');
      const response = await fetch(data.uploadUrl, { method: data.uploadMethod || 'PUT', headers: { 'Content-Type': file.type, ...(data.uploadHeaders || {}) }, body: file });
      if (!response.ok) throw new Error('The media upload failed. Please try again.');
      if (requestRevision !== revision.current || requestScope !== scope.current) return;
      setMedia(items => [...items, { type: file.type.startsWith('video/') ? 'video' : 'image', url: data.publicUrl }]);
      setInspections(items => ({ ...items, [data.publicUrl]: inspection }));
    } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed.'); } finally { setBusy(false); }
  }
  async function removePost(postId: string) {
    setBusy(true); setError('');
    try { const { data, ok } = await publishingRequest('delete', { postId }); if (!ok || data.simulated !== false || typeof data.message !== 'string') throw new Error(data.error?.message || 'Deletion was not confirmed.'); setDeleteId(null); setResult(current => current?._id === postId ? null : current); setNotice(t('تمت إزالة المنشور من مساحة النشر. قد تبقى النسخة المنشورة على القناة.', 'Post removed from the publishing workspace. A published copy may remain on the channel.')); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Delete failed.'); } finally { setBusy(false); }
  }
  function editPost(post: PublishingPost) {
    if (!editablePost(post)) { setError(t('هذا المنشور يحتوي على وجهات متعددة أو إعدادات خاصة ولا يمكن تعديله بهذا النموذج.', 'This post has multiple destinations or custom settings and cannot be edited in this composer.')); return; }
    const platform = post.platforms?.[0];
    let wallTime = '';
    try { if (post.scheduledFor) wallTime = publishingWallTime(post.scheduledFor, post.timezone || 'Africa/Cairo'); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'The schedule could not be read.'); return; }
    setEditingId(post._id); setContent(post.content || ''); setAccountId(typeof platform?.accountId === 'string' ? platform.accountId : platform?.accountId?._id || ''); setMedia((post.mediaItems || []).filter(m => m.type === 'image' || m.type === 'video'));
    const settings = platform?.platformSpecificData as { contentType?: string; shareToFeed?: boolean } | undefined;
    setStory(settings?.contentType === 'story'); setShareToFeed(settings?.shareToFeed); setInspections({}); setReviewed(false);
    setMode(post.status === 'scheduled' ? 'scheduled' : 'draft'); setScheduledFor(wallTime); setTimezone(post.timezone || 'Africa/Cairo'); setResult(null); setOutcomeDetails([]); setNotice('');
  }
  function postResult(post: PublishingPost) {
    return <div className="space-y-2"><div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-[var(--bg-subtle)] px-2 py-1 text-xs font-semibold">{post.status || t('حالة غير متاحة', 'Status unavailable')}</span><span className="break-all text-xs text-[var(--text-muted)]">{post._id}</span></div>{post.platforms?.map((p, i) => {
      const failure = p.errorMessage || p.platformError?.message || (typeof p.error === 'string' ? p.error : '');
      return <div key={i} className="flex flex-wrap gap-2 text-sm"><span>{p.platform}: {p.status || t('حالة غير متاحة', 'Status unavailable')}</span>{failure && <span className="text-rose-600">{failure}</span>}{p.platformPostUrl && publishingHttps(p.platformPostUrl) && <a className="text-[var(--accent-primary)] underline" target="_blank" rel="noopener noreferrer" href={p.platformPostUrl}>{t('عرض المنشور', 'View post')}</a>}</div>;
    })}</div>;
  }
  return <section dir={isRTL ? 'rtl' : 'ltr'} data-testid="publishing-workspace" className="space-y-8 text-[var(--text-primary)]">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-5"><div><div className="mb-2 text-sm font-semibold text-[var(--accent-primary)]">Facebook · Instagram</div><h2 className="text-2xl font-bold">{t('منشورك القادم يبدأ هنا', 'Your next post starts here')}</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">{t('اختر حسابك، جهّز رسالتك، وانشر في الوقت المناسب.', 'Choose your account, prepare your message, and publish when it matters.')}</p></div><button type="button" className={secondary} onClick={() => { setError(''); void refresh(); }} disabled={loading || busy}><RefreshCw className="me-2 inline" size={14} />{t('تحديث', 'Refresh')}</button></header>
    {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-300">{error}</div>}
    {notice && <div role="status" className="rounded-xl border border-[var(--border-subtle)] bg-[var(--accent-soft)] p-4 text-sm">{notice}</div>}
    {pending && <div role="status" className="space-y-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
      <p className="text-sm">{canReplayPending
        ? t('نتيجة الطلب السابق غير مؤكدة. احتفظنا بالطلب نفسه لإعادة التحقق خلال ٢٤ ساعة.', 'The previous request is unconfirmed. Its exact request is retained for the 24-hour replay window.')
        : t('نتيجة التغيير غير مؤكدة. راجع حالة المنشور وعلى القناة قبل أي محاولة أخرى؛ إعادة الإرسال قد تكرر العملية.', 'The change is unconfirmed. Review the post and its channel before another attempt; resending may repeat the operation.')}</p>
      {canReplayPending ? <button disabled={busy} className={secondary} onClick={() => void submit()}>{t('تحقق بنفس الطلب', 'Check with the same request')}</button>
        : <div className="flex flex-wrap gap-3"><button disabled={busy} className={secondary} onClick={() => void reviewPendingPost()}>{t('مراجعة المنشور الحالي', 'Review existing post')}</button>{reviewedPending && <button disabled={busy} className={secondary} onClick={() => { saveIntent(null); setReviewedPending(false); setEditingId(null); setContent(''); setMedia([]); }}>{t('راجعت النتيجة', 'I reviewed the result')}</button>}</div>}
    </div>}
    {omittedCount > 0 && <p role="status" className="text-sm text-[var(--text-secondary)]">{t('بعض المنشورات لا يمكن التحقق من حساباتها المتصلة حالياً، لذلك لم تُعرض.', 'Some posts could not be verified against your currently connected accounts and are not shown.')}</p>}
    <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(260px,.65fr)]">
      <form onSubmit={e => { e.preventDefault(); void submit(); }} className="space-y-5">
        <fieldset disabled={busy || !!pending} className="space-y-5 disabled:opacity-60">
          <label className="block space-y-2"><span className="text-sm font-semibold">{t('حساب النشر', 'Publishing account')}</span><select aria-label={t('حساب النشر', 'Publishing account')} className={field} value={accountId} disabled={!!editingId} onChange={e => { setAccountId(e.target.value); setStory(false); setShareToFeed(undefined); setError(''); }}><option value="">{t('اختر حساب Facebook أو Instagram', 'Choose a Facebook or Instagram account')}</option>{pages.map(a => <option key={a._id} value={a._id} disabled={a.isActive !== true || a.enabled === false || a.needsReconnection}>{a.displayName || a.username || a._id}{a.platform === 'instagram' ? ' · Instagram' : ''}{a.needsReconnection ? t(' — تحتاج إعادة اتصال', ' — reconnect required') : a.enabled === false ? t(' — غير مفعل للنشر', ' — publishing disabled') : a.isActive !== true ? t(' — غير نشطة', ' — inactive') : ''}</option>)}</select></label>
          {!loading && pages.length === 0 && <p className="text-sm text-[var(--text-secondary)]">{t('اربط صفحة Facebook أو حساب Instagram احترافياً من قسم الحسابات للبدء.', 'Connect a Facebook Page or professional Instagram account in Accounts to get started.')} <a href="/dashboard?tab=core_connect" className="text-[var(--accent-primary)] underline">{t('الحسابات', 'Accounts')}</a></p>}
          {selected?.enabled === false && <p role="status" className="text-sm text-amber-700">{t('الحساب متصل لكنه غير مفعل للنشر. راجع إعداداته في الحسابات.', 'This account is connected but is not enabled for publishing. Review its settings in Accounts.')}</p>}
          {instagram && <div className="space-y-3 border-b border-[var(--border-subtle)] pb-4">
            <fieldset><legend className="mb-2 text-sm font-semibold">{t('نوع منشور Instagram', 'Instagram post type')}</legend><div className="flex flex-wrap gap-4 text-sm"><label><input className="me-2" type="radio" name="instagram-format" checked={!story} onChange={() => setStory(false)} />{t('منشور / Reel', 'Feed / Reel')}</label><label><input className="me-2" type="radio" name="instagram-format" checked={story} onChange={() => setStory(true)} />{t('قصة', 'Story')}</label></div></fieldset>
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{story ? t('أضف صورة أو فيديو واحداً. نص القصة لا يظهر على Instagram.', 'Add one image or video. Story captions are not displayed on Instagram.') : t('صورة واحدة لمنشور، فيديو واحد لـ Reel، أو ٢–٢٠ صورة وفيديو لمنشور متعدد الوسائط.', 'One image for a feed post, one video for a Reel, or 2–20 images and videos for a carousel.')}</p>
            {!story && media.length === 1 && media[0].type === 'video' && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={shareToFeed !== false} onChange={e => setShareToFeed(e.target.checked)} />{t('إظهار Reel في الصفحة الرئيسية أيضاً', 'Also show the Reel on your profile feed')}</label>}
            <p role="status" className="text-sm">{quota ? t(`حد Instagram الحالي: ${quota.quotaUsage} من ${quota.quotaTotal} مستخدم${quota.quotaDurationSeconds ? ` خلال ${Math.round(quota.quotaDurationSeconds / 3600)} ساعة` : ''}.`, `Instagram publishing limit: ${quota.quotaUsage} of ${quota.quotaTotal} used${quota.quotaDurationSeconds ? ` over ${Math.round(quota.quotaDurationSeconds / 3600)} hours` : ''}.`) : quotaError || t('جارٍ التحقق من حد النشر…', 'Checking the publishing limit…')}</p>
            {quota && quota.quotaUsage >= quota.quotaTotal && <p className="text-xs text-amber-700 dark:text-amber-300">{t('تم الوصول إلى الحد الحالي. يمكنك حفظ مسودة أو جدولة المنشور لاحقاً.', 'The current limit is reached. You can save a draft or schedule for later.')}</p>}
          </div>}
          <label className="block space-y-2"><span className="text-sm font-semibold">{editingId ? t('تعديل الرسالة', 'Edit message') : t('ماذا تريد أن تخبر عملاءك؟', 'What would you like your customers to know?')}</span><textarea aria-label={t('نص المنشور', 'Post text')} rows={7} className={`${field} resize-y leading-relaxed`} value={content} onChange={e => setContent(e.target.value)} placeholder={t('اكتب رسالتك هنا…', 'Write your message here…')} /></label>
          {instagram && <p className={`text-end text-xs ${captionLength > 2200 ? 'text-rose-600' : 'text-[var(--text-muted)]'}`}>{captionLength.toLocaleString(isRTL ? 'ar' : 'en')} / {isRTL ? '٢٬٢٠٠' : '2,200'}</p>}
          <details className="rounded-xl border border-[var(--border-subtle)] p-4" open={media.length > 0 || undefined}><summary className="cursor-pointer text-sm font-semibold">{t('إضافة صورة أو فيديو', 'Add an image or video')}{media.length > 0 && ` (${media.length})`}</summary><div className="mt-4 space-y-3"><label className={`${secondary} inline-flex cursor-pointer items-center gap-2`}><Upload size={15} />{t('رفع ملف', 'Upload file')}<input aria-label="Upload media" type="file" accept="image/*,video/*" className="sr-only" onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} /></label><p className="text-xs text-[var(--text-secondary)]">{t('أو أضف رابط HTTPS عاماً يمكن الوصول إليه.', 'Or add a publicly accessible HTTPS URL.')}</p><div className="flex flex-wrap gap-2"><select aria-label="Media type" className={secondary} value={mediaType} onChange={e => setMediaType(e.target.value as 'image' | 'video')}><option value="image">{t('صورة', 'Image')}</option><option value="video">{t('فيديو', 'Video')}</option></select><input aria-label="Media URL" type="url" dir="ltr" className={`${field} min-w-0 flex-1`} value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder="https://…" /><button className={secondary} type="button" onClick={() => { if (!publishingHttps(mediaUrl)) { setError(t('استخدم رابط HTTPS صالحاً.', 'Use a valid HTTPS URL.')); return; } setMedia(m => [...m, { type: mediaType, url: mediaUrl }]); setMediaUrl(''); setError(''); }}>{t('إضافة', 'Add')}</button></div>{media.map((m, i) => <div key={`${m.url}-${i}`} className="flex min-w-0 items-center gap-3 border-t border-[var(--border-subtle)] pt-3"><span className="text-xs uppercase">{m.type}</span><span dir="ltr" className="min-w-0 flex-1 truncate text-xs">{m.url}</span><button type="button" aria-label={t('إزالة الوسائط', 'Remove media')} onClick={() => setMedia(items => items.filter((_, n) => n !== i))}><X size={16} /></button></div>)}</div></details>
          <fieldset><legend className="mb-3 text-sm font-semibold">{t('موعد النشر', 'When to publish')}</legend><div className="flex flex-wrap gap-2">{(['draft', 'now', 'scheduled'] as const).map(value => <label key={value} className={`cursor-pointer rounded-xl border px-4 py-2.5 text-sm ${mode === value ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]' : 'border-[var(--border-subtle)]'}`}><input className="me-2 accent-[var(--accent-primary)]" type="radio" name="publish-mode" checked={mode === value} onChange={() => setMode(value)} />{value === 'draft' ? t('مسودة', 'Save draft') : value === 'now' ? t('الآن', 'Publish now') : t('جدولة', 'Schedule')}</label>)}</div></fieldset>
          {mode === 'scheduled' && <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-2 text-sm"><span>{t('التاريخ والوقت', 'Date and time')}</span><input className={field} aria-label="Schedule date and time" type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} required /></label><label className="space-y-2 text-sm"><span>{t('المنطقة الزمنية', 'Timezone')}</span><input aria-label="Timezone" className={field} value={timezone} onChange={e => setTimezone(e.target.value)} required placeholder="Africa/Cairo" /></label></div>}
        </fieldset>
        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border-subtle)] pt-5">{(!reviewed || mode === 'draft') && <button type="submit" disabled={busy || checking || !!pending || !usable} className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"><Send size={16} />{busy ? t('جارٍ التنفيذ…', 'Working…') : checking ? t('جارٍ التحقق…', 'Checking…') : mode !== 'draft' && !reviewed ? t('مراجعة المنشور', 'Review post') : editingId ? t('حفظ التعديل', 'Save changes') : mode === 'draft' ? t('حفظ المسودة', 'Save draft') : mode === 'scheduled' ? t('جدولة المنشور', 'Schedule post') : t('نشر الآن', 'Publish now')}</button>}{reviewed && mode !== 'draft' && <button type="button" className={secondary} onClick={() => setReviewed(false)} disabled={busy || !!pending}>{t('العودة للتعديل', 'Back to editing')}</button>}{editingId && <button type="button" disabled={busy || !!pending} className={secondary} onClick={() => { setEditingId(null); setContent(''); setMedia([]); setStory(false); setShareToFeed(undefined); }}>{t('إلغاء التعديل', 'Cancel edit')}</button>}</div>
      </form>
      <aside ref={reviewPanel} tabIndex={-1} aria-label={t('مراجعة المنشور', 'Post review')} className="min-w-0 space-y-4 border-t border-[var(--border-subtle)] pt-5 xl:border-s xl:border-t-0 xl:ps-6 xl:pt-0"><h3 className="text-sm font-semibold">{reviewed ? t('راجع التفاصيل ثم أكد الإرسال', 'Review the details, then confirm') : t('مراجعة قبل الإرسال', 'Before you send')}</h3><p className="text-lg font-semibold">{selected?.displayName || selected?.username || t('اختر حساباً للنشر', 'Choose an account to publish')}</p>{selected && <p className="text-sm text-[var(--text-secondary)]">{selected.platform === 'instagram' ? `Instagram · ${format}` : 'Facebook'} · {mode === 'draft' ? t('مسودة', 'Draft') : mode === 'now' ? t('النشر الآن', 'Publish now') : `${scheduledFor.replace('T', ' ')} · ${timezone}`}</p>}<p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--text-secondary)]">{instagram && story ? t('نص القصة لن يظهر على Instagram.', 'Story captions will not appear on Instagram.') : content || t('ستظهر رسالتك هنا أثناء الكتابة.', 'Your message appears here as you write.')}</p>{media.map((m,i) => <div key={i} className="space-y-2">{m.type === 'image' ? <img src={m.url} alt={t('صورة المنشور', 'Post image')} className="max-h-64 w-full rounded-xl object-contain" /> : <video src={m.url} controls preload="metadata" className="max-h-64 w-full rounded-xl" />}<p className="text-xs text-[var(--text-muted)]">{t('ملف', 'Item')} {i + 1}{inspections[m.url]?.width ? ` · ${inspections[m.url].width} × ${inspections[m.url].height}` : ` · ${t('الأبعاد غير معروفة', 'Dimensions unknown')}`}{inspections[m.url]?.size != null && ` · ${(inspections[m.url].size! / 1024 ** 2).toFixed(2)} MB`}{m.type === 'video' && ` · ${inspections[m.url]?.duration != null ? `${Math.round(inspections[m.url].duration!)} ${t('ثانية', 'seconds')}` : t('المدة غير معروفة', 'Duration unknown')}`}</p></div>)}{validationWarnings.length > 0 && <ul role="status" className="list-inside list-disc space-y-2 text-sm text-amber-700 dark:text-amber-300">{validationWarnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}<div className="flex items-start gap-2 border-t border-[var(--border-subtle)] pt-4 text-xs leading-relaxed text-[var(--text-muted)]"><Calendar size={15} className="shrink-0" /><p>{t('هذه مراجعة للمحتوى. حالة النشر الفعلية تظهر بعد استجابة الخدمة.', 'This is a content review. The actual publishing status appears after the service responds.')}</p></div>{reviewed && mode !== 'draft' && <button type="button" disabled={busy || checking || !!pending || !usable} onClick={() => void submit()} className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"><Send size={16} />{busy ? t('جارٍ التنفيذ…', 'Working…') : editingId ? t('حفظ التعديل', 'Save changes') : mode === 'scheduled' ? t('جدولة المنشور', 'Schedule post') : t('نشر الآن', 'Publish now')}</button>}{result && <div aria-label="Publishing result" className="border-t border-[var(--border-subtle)] pt-4"><p className="mb-2 text-xs font-semibold">{t('نتيجة الطلب السابق', 'Previous request result')}</p>{postResult(result)}{outcomeDetails.length > 0 && <ul className="mt-3 list-inside list-disc space-y-2 text-sm">{outcomeDetails.map((detail, index) => <li key={`${index}-${detail}`}>{detail}</li>)}</ul>}</div>}</aside>
    </div>
    <section className="border-t border-[var(--border-subtle)] pt-6"><div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-bold">{t('منشوراتك ونتائج النشر', 'Your posts and publishing results')}</h3><span className="text-xs text-[var(--text-muted)]">{t('الحالة من الخدمة مباشرة', 'Status from the service')}</span></div>{loading ? <p role="status" className="py-6 text-sm">{t('جارٍ تحميل المنشورات…', 'Loading posts…')}</p> : posts.length === 0 ? <p className="py-6 text-sm text-[var(--text-secondary)]">{t('لا توجد منشورات بعد. ابدأ بمسودة من النموذج أعلاه.', 'No posts yet. Start with a draft above.')}</p> : <div className="divide-y divide-[var(--border-subtle)]">{posts.map(post => <article key={post._id} className="flex flex-wrap items-start justify-between gap-4 py-5"><div className="min-w-0 flex-1 space-y-3"><p className="whitespace-pre-wrap break-words text-sm">{post.content || t('منشور وسائط', 'Media post')}</p>{postResult(post)}{['draft', 'scheduled'].includes(post.status || '') && !editablePost(post) && <p className="text-xs text-[var(--text-secondary)]">{t('الإعدادات الخاصة أو الوجهات المتعددة محفوظة. هذا المنشور متاح للمراجعة فقط في هذا النموذج.', 'Advanced settings or multiple destinations are preserved. This post is read-only in this composer.')}</p>}{post.scheduledFor && <p className="text-xs text-[var(--text-secondary)]">{post.scheduledFor} {post.timezone}</p>}</div><div className="flex flex-wrap gap-2">{['draft', 'scheduled'].includes(post.status || '') && editablePost(post) && <button className={secondary} disabled={busy || !!pending} onClick={() => editPost(post)}>{t('تعديل', 'Edit')}</button>}{['failed', 'partial', 'partially_published'].includes(post.status || '') && <button className={secondary} disabled={busy || !!pending} onClick={() => void submit({ key: crypto.randomUUID(), scope: scope.current || '', body: { action: 'retry', postId: post._id } })}>{t('إعادة المحاولة', 'Retry')}</button>}{deleteId === post._id ? <><button className={secondary} disabled={busy || !!pending} onClick={() => void removePost(post._id)}>{t('تأكيد الإزالة من مساحة النشر', 'Confirm removal from workspace')}</button><button className={secondary} onClick={() => setDeleteId(null)}>{t('إلغاء', 'Cancel')}</button></> : <button className={secondary} disabled={busy || !!pending} onClick={() => setDeleteId(post._id)}>{t('إزالة من مساحة النشر', 'Remove from workspace')}</button>}</div></article>)}</div>}<div className="mt-4 flex items-center gap-3"><button className={secondary} disabled={page === 1 || loading} onClick={() => setPage(p => p - 1)}>{t('السابق', 'Previous')}</button><span className="text-xs">{t('صفحة', 'Page')} {page}</span><button className={secondary} disabled={!hasMore || loading} onClick={() => setPage(p => p + 1)}>{t('التالي', 'Next')}</button></div></section>
  </section>;
}
