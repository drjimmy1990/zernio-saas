'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import { getLocalizedText } from '@/i18n/dictionaries';
import {
  MessageSquare,
  Send,
  Phone,
  Sparkles,
  Bot,
  User,
  Check,
  CheckCheck,
  Plus,
  RefreshCw,
  Search,
  Filter,
  ShieldAlert,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import type {
  ConversationThread,
  MessageItem,
  OwnedPhoneNumber,
} from '@/types/telephony';

interface LiveSmsAndWhatsAppInboxProps {
  organizationId: string;
  ownedNumbers: OwnedPhoneNumber[];
  threads: ConversationThread[];
  onThreadsUpdated?: () => void;
  preselectedVirtualNumber?: string;
}

export function LiveSmsAndWhatsAppInbox({
  organizationId,
  ownedNumbers,
  threads: initialThreads,
  onThreadsUpdated,
  preselectedVirtualNumber,
}: LiveSmsAndWhatsAppInboxProps) {
  const { locale } = useThemeAndLocale();
  const isAr = locale === 'ar';
  const loc = (ar: string, en: string) => getLocalizedText(locale, { ar, en });

  const [channelFilter, setChannelFilter] = useState<'all' | 'sms' | 'whatsapp'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedThreadId, setSelectedThreadId] = useState<string>(
    initialThreads[0]?.id || ''
  );

  const [messageText, setMessageText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationType, setSimulationType] = useState<'otp' | 'order_inquiry' | 'urgent_support'>('otp');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync selected thread ID if valid
  useEffect(() => {
    if (initialThreads.length > 0 && !initialThreads.some((t) => t.id === selectedThreadId)) {
      setSelectedThreadId(initialThreads[0].id);
    }
  }, [initialThreads, selectedThreadId]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedThreadId, initialThreads]);

  // Filtered threads list
  const filteredThreads = initialThreads.filter((t) => {
    if (channelFilter !== 'all' && t.channel !== channelFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        t.customerName.toLowerCase().includes(q) ||
        t.customerNumber.includes(q) ||
        t.lastMessage.toLowerCase().includes(q) ||
        t.virtualNumber.includes(q)
      );
    }
    return true;
  });

  const activeThread = initialThreads.find((t) => t.id === selectedThreadId) || filteredThreads[0];

  // Send Outbound Message Handler
  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeThread) return;

    setIsSending(true);
    const textToSend = messageText;
    setMessageText('');

    try {
      if (activeThread.channel === 'whatsapp') {
        const targetNumberObj = ownedNumbers.find((n) => n.phoneNumber === activeThread.virtualNumber);
        await fetch('/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subService: 'telephony',
            action: 'send_test_whatsapp',
            organizationId,
            phoneNumberId: targetNumberObj?.id || ownedNumbers[0]?.id || 'num_us_01',
            recipientPhone: activeThread.customerNumber,
            customMessage: textToSend,
          }),
        });
      } else {
        await fetch('/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subService: 'telephony',
            action: 'send_sms',
            organizationId,
            fromNumber: activeThread.virtualNumber,
            toNumber: activeThread.customerNumber,
            text: textToSend,
          }),
        });
      }

      onThreadsUpdated?.();
    } catch {
      alert('Failed to send outbound message');
    } finally {
      setIsSending(false);
    }
  };

  // Simulate Inbound Customer / OTP Message
  const handleSimulateInbound = async (type: 'otp' | 'order_inquiry' | 'urgent_support') => {
    setIsSimulating(true);
    const virtualNum = activeThread?.virtualNumber || ownedNumbers[0]?.phoneNumber || '+1 (415) 555-0100';
    const customerNum = activeThread?.customerNumber || '+1 (415) 992-8172';

    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subService: 'telephony',
          action: 'simulate_incoming_sms',
          organizationId,
          fromNumber: customerNum,
          toNumber: virtualNum,
          type,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onThreadsUpdated?.();
        if (data.conversationId) {
          setSelectedThreadId(data.conversationId);
        }
      } else {
        alert(data.error || 'Failed to simulate incoming SMS');
      }
    } catch {
      alert('Network error simulating inbound message');
    } finally {
      setIsSimulating(false);
    }
  };

  // Quick Template Insertion
  const handleApplyTemplate = (tpl: string) => {
    if (tpl === 'order_update') {
      setMessageText('Hello, your order #88921 has been confirmed and is on its way. Track live: https://asra3.com/track/88921');
    } else if (tpl === 'promo_offer') {
      setMessageText('Special Offer: Get 50% off enterprise plans for all new subscribers today only!');
    } else if (tpl === 'otp_support') {
      setMessageText('Thank you for contacting Asra3 verified support. How can we assist your business today?');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner with Inbound Simulation Actions */}
      <div className="luxury-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            {loc('صندوق الرسائل الحية المشتركة (Live 2-Way SMS & WhatsApp Inbox)', 'Live 2-Way SMS & WhatsApp Omnichannel Inbox')}
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            {loc('استقبال وإرسال الرسائل الحية ورسائل OTP والتنبيهات عبر أرقامك الافتراضية', 'Receive inbound customer SMS, OTPs & send WhatsApp messages from purchased virtual numbers')}
          </p>
        </div>

        {/* Simulate Incoming SMS Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            disabled={isSimulating}
            onClick={() => void handleSimulateInbound('otp')}
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-600 hover:bg-amber-500/20 transition disabled:opacity-50"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>{loc('محاكاة استلام OTP', 'Simulate Inbound OTP')}</span>
          </button>

          <button
            disabled={isSimulating}
            onClick={() => void handleSimulateInbound('order_inquiry')}
            className="flex items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-600 hover:bg-sky-500/20 transition disabled:opacity-50"
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>{loc('محاكاة رسالة عميل', 'Simulate Customer SMS')}</span>
          </button>
        </div>
      </div>

      {/* Main Omnichannel Messaging Pane (Split View) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 min-h-[580px]">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: CONVERSATION THREADS LIST (4 Cols) */}
        {/* ========================================================================= */}
        <div className="luxury-card flex flex-col justify-between p-4 lg:col-span-4">
          <div className="space-y-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 rounded-xl bg-[var(--bg-subtle)] p-1 text-xs font-bold">
              <button
                onClick={() => setChannelFilter('all')}
                className={`flex-1 rounded-lg py-1.5 text-center transition ${
                  channelFilter === 'all'
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                {loc('الكل', 'All')}
              </button>
              <button
                onClick={() => setChannelFilter('whatsapp')}
                className={`flex-1 rounded-lg py-1.5 text-center transition ${
                  channelFilter === 'whatsapp'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                WhatsApp
              </button>
              <button
                onClick={() => setChannelFilter('sms')}
                className={`flex-1 rounded-lg py-1.5 text-center transition ${
                  channelFilter === 'sms'
                    ? 'bg-[var(--accent-primary)] text-white shadow-xs'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                SMS
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={loc('بحث في المحادثات...', 'Search threads or numbers...')}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] ps-3 pe-8 py-2 text-xs text-[var(--text-primary)] focus:outline-none"
              />
              <Search className="absolute end-2.5 top-2.5 h-3.5 w-3.5 text-[var(--text-muted)]" />
            </div>

            {/* Threads List */}
            <div className="space-y-2 max-h-[460px] overflow-y-auto pe-1">
              {filteredThreads.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                  {loc('لا توجد محادثات تطابق البحث', 'No conversation threads found')}
                </div>
              ) : (
                filteredThreads.map((thread) => {
                  const isSelected = thread.id === selectedThreadId;
                  const isWa = thread.channel === 'whatsapp';
                  return (
                    <div
                      key={thread.id}
                      onClick={() => setSelectedThreadId(thread.id)}
                      className={`cursor-pointer rounded-xl border p-3 transition ${
                        isSelected
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)]/60 hover:bg-[var(--bg-subtle)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[9px] font-extrabold ${
                              isWa
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : 'bg-purple-500/10 text-purple-600'
                            }`}
                          >
                            {isWa ? 'WhatsApp' : 'SMS'}
                          </span>
                          <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[140px]">
                            {thread.customerName}
                          </span>
                        </div>
                        {thread.unreadCount > 0 && (
                          <span className="rounded-full bg-[var(--accent-primary)] px-1.5 py-0.2 text-[9px] font-extrabold text-white">
                            {thread.unreadCount}
                          </span>
                        )}
                      </div>

                      <div dir="ltr" className="mt-1 text-[11px] font-mono text-[var(--text-muted)] text-start">
                        {thread.customerNumber}
                      </div>

                      <p className="mt-1 text-xs text-[var(--text-secondary)] line-clamp-1">
                        {thread.lastMessage}
                      </p>

                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                        <span dir="ltr">Line: {thread.virtualNumber}</span>
                        <span>{new Date(thread.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: ACTIVE CHAT PANE (8 Cols) */}
        {/* ========================================================================= */}
        <div className="luxury-card flex flex-col justify-between p-4 lg:col-span-8">
          {activeThread ? (
            <div className="flex flex-col h-full justify-between">
              {/* Chat Header */}
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold text-xs ${
                      activeThread.channel === 'whatsapp'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[var(--accent-primary)] text-white'
                    }`}
                  >
                    {activeThread.channel === 'whatsapp' ? 'WA' : 'SMS'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-[var(--text-primary)]">
                        {activeThread.customerName}
                      </span>
                      <span dir="ltr" className="font-mono text-[11px] text-[var(--text-muted)]">
                        ({activeThread.customerNumber})
                      </span>
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)]">
                      {loc('مستقبل عبر رقمك:', 'Received on virtual line:')}{' '}
                      <span dir="ltr" className="font-mono font-bold text-[var(--accent-primary)]">{activeThread.virtualNumber}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Quick Template Triggers */}
                <div className="hidden sm:flex items-center gap-1.5">
                  <button
                    onClick={() => handleApplyTemplate('order_update')}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-2.5 py-1 text-[10px] font-bold text-[var(--text-primary)] hover:border-[var(--accent-primary)]"
                  >
                    + {loc('تأكيد الطلب', 'Order Update')}
                  </button>
                  <button
                    onClick={() => handleApplyTemplate('promo_offer')}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-2.5 py-1 text-[10px] font-bold text-[var(--text-primary)] hover:border-[var(--accent-primary)]"
                  >
                    + {loc('عرض 50%', 'Promo 50%')}
                  </button>
                </div>
              </div>

              {/* Chat Messages Body */}
              <div
                className={`my-3 flex-1 overflow-y-auto space-y-3 p-3 rounded-2xl border border-[var(--border-subtle)] max-h-[380px] ${
                  activeThread.channel === 'whatsapp'
                    ? 'bg-[#0b141a]/95 text-white'
                    : 'bg-[var(--bg-subtle)]/40 text-[var(--text-primary)]'
                }`}
              >
                {activeThread.messages.map((msg) => {
                  const isOutbound = msg.direction === 'outbound';
                  const isWa = activeThread.channel === 'whatsapp';

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-2xl p-3 text-xs shadow-xs ${
                          isOutbound
                            ? isWa
                              ? 'bg-[#005c4b] text-white rounded-ee-xs'
                              : 'bg-[var(--accent-primary)] text-white rounded-ee-xs'
                            : isWa
                            ? 'bg-[#202c33] text-white rounded-es-xs'
                            : 'bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-es-xs'
                        }`}
                      >
                        <p className="leading-relaxed">{msg.text}</p>
                        <div
                          className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                            isOutbound ? (isWa ? 'text-emerald-200' : 'text-white/80') : 'text-zinc-400'
                          }`}
                        >
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isOutbound && (
                            <span>
                              {isWa ? (
                                <span className="text-[#53bdeb] font-extrabold">✓✓</span>
                              ) : (
                                <span>{msg.status === 'read' ? '✓✓' : '✓'}</span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer Input & Send Action */}
              <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={
                      activeThread.channel === 'whatsapp'
                        ? loc('اكتب رسالة واتساب المباشرة أو اختر قالباً...', 'Type a WhatsApp message or broadcast template...')
                        : loc('اكتب رسالة SMS نصية صادرة من رقمك الافتراضي...', 'Type an outbound SMS from your virtual line...')
                    }
                    className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-2.5 text-xs text-[var(--text-primary)] focus:outline-none"
                  />
                  <button
                    disabled={isSending || !messageText.trim()}
                    onClick={() => void handleSendMessage()}
                    className={`flex items-center justify-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold text-white shadow-sm transition disabled:opacity-50 ${
                      activeThread.channel === 'whatsapp'
                        ? 'bg-emerald-600 hover:bg-emerald-500'
                        : 'bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)]'
                    }`}
                  >
                    {isSending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>{loc('إرسال', 'Send')}</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <span>
                    {loc('القناة النشطة:', 'Active Channel:')}{' '}
                    <span className="font-bold">{activeThread.channel === 'whatsapp' ? 'WhatsApp Cloud API' : 'Direct PSTN Carrier SMS'}</span>
                  </span>
                  <span>
                    {loc('الإيصال: فوري (Delivered & Read ✓✓)', 'Delivery: Instant ✓✓')}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center my-auto min-h-[300px]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-primary)] mb-3">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                {loc('لا توجد محادثات SMS أو واتساب حتى الآن', 'No SMS or WhatsApp threads yet')}
              </h4>
              <p className="mt-1 text-xs text-[var(--text-secondary)] max-w-sm">
                {loc(
                  'صندوق الرسائل نظيف وجاهز. يمكنك محاكاة رسالة واردة عبر أداة المحاكاة السريعة أعلاه أو استقبال رسائل حقيقية على خطوطك.',
                  'Your inbox is clean and ready. You can test inbound message ingestion with the simulator above or receive live customer SMS.'
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
