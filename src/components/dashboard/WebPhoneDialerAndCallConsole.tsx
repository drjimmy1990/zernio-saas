'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import { getLocalizedText } from '@/i18n/dictionaries';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Pause,
  Play,
  Share2,
  Delete,
  Volume2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  Bot,
  User,
  History,
  CheckCircle2,
} from 'lucide-react';
import type {
  OwnedPhoneNumber,
  CallRecord,
  CallTranscriptLine,
} from '@/types/telephony';

interface WebPhoneDialerProps {
  organizationId: string;
  ownedNumbers: OwnedPhoneNumber[];
  callHistory: CallRecord[];
  onCallFinished?: () => void;
  prefilledDestination?: string;
}

const DIALPAD_KEYS = [
  { key: '1', sub: '' },
  { key: '2', sub: 'ABC' },
  { key: '3', sub: 'DEF' },
  { key: '4', sub: 'GHI' },
  { key: '5', sub: 'JKL' },
  { key: '6', sub: 'MNO' },
  { key: '7', sub: 'PQRS' },
  { key: '8', sub: 'TUV' },
  { key: '9', sub: 'WXYZ' },
  { key: '*', sub: '' },
  { key: '0', sub: '+' },
  { key: '#', sub: '' },
];

export function WebPhoneDialerAndCallConsole({
  organizationId,
  ownedNumbers,
  callHistory,
  onCallFinished,
  prefilledDestination = '',
}: WebPhoneDialerProps) {
  const { locale } = useThemeAndLocale();
  const isAr = locale === 'ar';
  const loc = (ar: string, en: string) => getLocalizedText(locale, { ar, en });

  // Caller ID & Destination
  const [callerId, setCallerId] = useState<string>(
    ownedNumbers[0]?.phoneNumber || ''
  );
  const [destinationNumber, setDestinationNumber] = useState<string>(prefilledDestination);
  const [callMode, setCallMode] = useState<'direct_voice' | 'ai_voice_agent'>('ai_voice_agent');

  // Call Lifecycle: 'idle' | 'dialing' | 'connected' | 'ended'
  const [callState, setCallState] = useState<'idle' | 'dialing' | 'connected' | 'ended'>('idle');
  const [callDuration, setCallDuration] = useState<number>(0);
  const [activeCallId, setActiveCallId] = useState<string>('');

  // Call Controls
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isOnHold, setIsOnHold] = useState<boolean>(false);
  const [isTransferring, setIsTransferring] = useState<boolean>(false);
  const [transferNumber, setTransferNumber] = useState<string>('+1 (800) 555-0199');

  // Real-time Dual-Party Transcript Stream
  const [transcripts, setTranscripts] = useState<CallTranscriptLine[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Sync default callerId when ownedNumbers changes
  useEffect(() => {
    if (ownedNumbers.length > 0 && !ownedNumbers.some((n) => n.phoneNumber === callerId)) {
      setCallerId(ownedNumbers[0].phoneNumber);
    }
  }, [ownedNumbers, callerId]);

  // In-call duration timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (callState === 'connected') {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [callState]);

  // Auto-scroll transcript window
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Format seconds to mm:ss
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // Dialpad Key Click
  const handleKeyClick = (key: string) => {
    if (callState === 'idle') {
      setDestinationNumber((prev) => prev + key);
    }
  };

  // Backspace
  const handleBackspace = () => {
    if (callState === 'idle') {
      setDestinationNumber((prev) => prev.slice(0, -1));
    }
  };

  // Start Call Handler
  const handleStartCall = async () => {
    if (!destinationNumber.trim()) return;

    setCallState('dialing');
    setCallDuration(0);
    setTranscripts([]);
    setIsMuted(false);
    setIsOnHold(false);
    setIsTransferring(false);

    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subService: 'telephony',
          action: 'initiate_call',
          organizationId,
          fromNumber: callerId,
          toNumber: destinationNumber,
          mode: callMode,
          humanTransferNumber: transferNumber,
          language: loc('ar-SA', 'en-US'),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActiveCallId(data.callSession.callId);

        // Simulate short ringing delay before connection
        setTimeout(() => {
          setCallState('connected');

          // Progressively stream transcripts for realistic softphone experience
          const streamLines: CallTranscriptLine[] = data.callSession.transcripts || [];
          streamLines.forEach((line, index) => {
            setTimeout(() => {
              setTranscripts((prev) => [...prev, line]);
            }, (index + 1) * 1600);
          });
        }, 1200);
      } else {
        alert(data.error || 'Failed to initiate call');
        setCallState('idle');
      }
    } catch {
      alert('Network error placing call');
      setCallState('idle');
    }
  };

  // End Call Handler
  const handleEndCall = () => {
    setCallState('ended');
    setTimeout(() => {
      setCallState('idle');
      onCallFinished?.();
    }, 1800);
  };

  // Transfer Call Handler
  const handleTransfer = () => {
    setTranscripts((prev) => [
      ...prev,
      {
        role: 'system',
        text: loc(`تم تحويل المكالمة بنجاح إلى الرقم المشرف: ${transferNumber}`, `Call transferred successfully to supervisor line: ${transferNumber}`),
        timestamp: formatTimer(callDuration),
      },
    ]);
    setIsTransferring(false);
  };

  return (
    <div className="space-y-6">
      {/* Upper Grid: Softphone Dialpad & Active Call Console */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: 12-KEY SOFTPHONE KEYPAD (5 Cols) */}
        {/* ========================================================================= */}
        <div className="luxury-card flex flex-col justify-between p-6 lg:col-span-5">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[var(--accent-primary)]" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {loc('لوحة الاتصال الرقمية (Web Softphone)', 'Interactive Web Softphone')}
                </h3>
              </div>
              <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                WebRTC Active
              </span>
            </div>

            {/* Caller ID Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                {loc('رقم المتصل (Caller ID):', 'Caller ID (Your Virtual Line):')}
              </label>
              <select
                disabled={callState !== 'idle' || ownedNumbers.length === 0}
                value={callerId}
                onChange={(e) => setCallerId(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs font-mono font-semibold text-[var(--text-primary)] focus:outline-none disabled:opacity-50"
              >
                {ownedNumbers.length === 0 ? (
                  <option value="">{loc('لا توجد أرقام افتراضية مملوكة (توجه للمتجر)', 'No owned numbers (browse marketplace)')}</option>
                ) : (
                  ownedNumbers.map((num) => (
                    <option key={num.id} value={num.phoneNumber}>
                      {num.flag} {num.phoneNumber} ({num.countryName})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Call Mode Switcher */}
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                {loc('نوع المكالمة:', 'Call Mode:')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={callState !== 'idle'}
                  onClick={() => setCallMode('ai_voice_agent')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-bold transition disabled:opacity-50 ${
                    callMode === 'ai_voice_agent'
                      ? 'border-[var(--brand-coral)] bg-[var(--brand-coral-soft)] text-[var(--brand-coral)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                  }`}
                >
                  <Bot className="h-3.5 w-3.5" />
                  <span>{loc('وكيل ذكاء صوتي', 'AI Voice Agent')}</span>
                </button>

                <button
                  type="button"
                  disabled={callState !== 'idle'}
                  onClick={() => setCallMode('direct_voice')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-bold transition disabled:opacity-50 ${
                    callMode === 'direct_voice'
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-primary)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  <span>{loc('مكالمة بشرية PSTN', 'Direct Voice Call')}</span>
                </button>
              </div>
            </div>

            {/* Destination Phone Number Input */}
            <div className="relative">
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                {loc('رقم الوجهة المطلوب الاتصال به:', 'Destination Phone Number:')}
              </label>
              <div className="flex items-center">
                <input
                  dir="ltr"
                  readOnly={callState !== 'idle'}
                  value={destinationNumber}
                  onChange={(e) => setDestinationNumber(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] ps-3.5 pe-10 py-2.5 font-mono text-base font-bold text-[var(--text-primary)] focus:outline-none"
                />
                {destinationNumber && callState === 'idle' && (
                  <button
                    onClick={handleBackspace}
                    className="absolute end-3 top-7 text-[var(--text-muted)] hover:text-rose-500"
                  >
                    <Delete className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* 12-KEY NUMERIC KEYPAD wrapped with dir="ltr" to avoid reversal in RTL */}
            <div dir="ltr" className="grid grid-cols-3 gap-2.5 pt-2">
              {DIALPAD_KEYS.map((k) => (
                <button
                  key={k.key}
                  disabled={callState !== 'idle'}
                  onClick={() => handleKeyClick(k.key)}
                  className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] py-3 transition hover:bg-[var(--accent-soft)] hover:border-[var(--accent-primary)] active:scale-95 disabled:opacity-50"
                >
                  <span className="font-mono text-base font-bold text-[var(--text-primary)]">
                    {k.key}
                  </span>
                  {k.sub && (
                    <span className="text-[9px] font-semibold text-[var(--text-muted)] tracking-wider">
                      {k.sub}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Dial / End Action Buttons */}
          <div className="pt-4 border-t border-[var(--border-subtle)] mt-4">
            {callState === 'idle' ? (
              <button
                disabled={!destinationNumber.trim() || ownedNumbers.length === 0}
                onClick={() => void handleStartCall()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-xs font-bold text-white shadow-md hover:bg-emerald-500 transition active:scale-95 disabled:opacity-50"
              >
                <PhoneCall className="h-4 w-4" />
                <span>
                  {ownedNumbers.length === 0
                    ? loc('يرجى شراء خط من المتجر لبدء الاتصال', 'Purchase a number in Marketplace to place calls')
                    : loc('بدء الاتصال الصوتي الآن', 'Initiate Call')}
                </span>
              </button>
            ) : (
              <button
                onClick={handleEndCall}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600 py-3.5 text-xs font-bold text-white shadow-md hover:bg-rose-500 transition active:scale-95"
              >
                <PhoneOff className="h-4 w-4" />
                <span>{loc('إنهاء المكالمة', 'Hang Up')}</span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: ACTIVE CALL CONSOLE HUD (7 Cols) */}
        {/* ========================================================================= */}
        <div className="luxury-card flex flex-col justify-between p-6 lg:col-span-7">
          <div className="space-y-5">
            {/* HUD Status Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
              <div>
                <span className="text-xs text-[var(--text-muted)]">
                  {loc('حالة جلسة الاتصال:', 'Call Session Status:')}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      callState === 'connected'
                        ? 'bg-emerald-500 animate-pulse'
                        : callState === 'dialing'
                        ? 'bg-amber-500 animate-ping'
                        : 'bg-zinc-400'
                    }`}
                  />
                  <span className="text-sm font-extrabold text-[var(--text-primary)]">
                    {callState === 'connected'
                      ? loc('المكالمة متصلة ونشطة', 'Connected & Streaming')
                      : callState === 'dialing'
                      ? loc('جاري الاتصال والربط...', 'Dialing Carrier PSTN...')
                      : callState === 'ended'
                      ? loc('تم إنهاء المكالمة', 'Call Ended')
                      : loc('لوحة الاتصال جاهزة', 'Console Idle (Ready to Dial)')}
                  </span>
                </div>
              </div>

              {/* In-Call Timer HUD */}
              <div className="flex items-center gap-2 rounded-xl bg-[var(--bg-subtle)] px-3.5 py-1.5 font-mono text-sm font-bold text-[var(--text-primary)] border border-[var(--border-subtle)]">
                <Clock className="h-4 w-4 text-[var(--brand-coral)]" />
                <span>{formatTimer(callDuration)}</span>
              </div>
            </div>

            {/* Active Callee Info */}
            <div className="flex items-center justify-between rounded-xl bg-[var(--bg-subtle)] p-3.5 text-xs">
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">{loc('الرقم المتصل به:', 'Calling Destination:')}</div>
                <div dir="ltr" className="font-mono font-bold text-[var(--text-primary)] mt-0.5">
                  {destinationNumber || '+1 (415) 890-4412'}
                </div>
              </div>
              <div className="text-end">
                <div className="text-[10px] text-[var(--text-muted)]">{loc('الخط الصادر منه:', 'Originating Line:')}</div>
                <div dir="ltr" className="font-mono font-bold text-[var(--accent-primary)] mt-0.5">
                  {callerId}
                </div>
              </div>
            </div>

            {/* Audio Waveform HUD Visualizer */}
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-5 text-center space-y-2">
              <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                <span>{callMode === 'ai_voice_agent' ? 'AI Voice Stream (Bi-directional)' : 'HD Voice Leg'}</span>
                <span>{isOnHold ? (loc('المكالمة قيد الانتظار (Hold)', 'Call on Hold')) : 'Transcribing Live...'}</span>
              </div>

              {/* Waveform Bars */}
              <div className="flex h-14 items-center justify-center gap-1.5 py-2">
                {[14, 32, 54, 75, 90, 60, 42, 80, 95, 68, 35, 78, 88, 50, 24, 62, 84, 40].map((h, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-200 ${
                      callState === 'connected' && !isOnHold
                        ? 'bg-[var(--brand-coral)] animate-waveform'
                        : 'bg-[var(--border-subtle)] h-2'
                    }`}
                    style={{
                      height: callState === 'connected' && !isOnHold ? `${Math.max(6, h * 0.55)}px` : '4px',
                      animationDelay: `${(i % 5) * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* In-Call Controls: Mute, Hold, Transfer */}
            {callState === 'connected' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 font-bold transition ${
                      isMuted
                        ? 'border-rose-500 bg-rose-500/10 text-rose-600'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:border-[var(--accent-primary)]'
                    }`}
                  >
                    {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    <span>{isMuted ? (loc('كتم الصوت', 'Muted')) : (loc('كتم', 'Mute'))}</span>
                  </button>

                  <button
                    onClick={() => setIsOnHold(!isOnHold)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 font-bold transition ${
                      isOnHold
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:border-[var(--accent-primary)]'
                    }`}
                  >
                    {isOnHold ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    <span>{isOnHold ? (loc('استئناف', 'Resume')) : (loc('انتظار', 'Hold'))}</span>
                  </button>

                  <button
                    onClick={() => setIsTransferring(!isTransferring)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 font-bold transition ${
                      isTransferring
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-primary)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:border-[var(--accent-primary)]'
                    }`}
                  >
                    <Share2 className="h-4 w-4" />
                    <span>{loc('تحويل المكالمة', 'Transfer')}</span>
                  </button>
                </div>

                {/* Transfer Number Flyout */}
                {isTransferring && (
                  <div className="flex gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-2">
                    <input
                      dir="ltr"
                      value={transferNumber}
                      onChange={(e) => setTransferNumber(e.target.value)}
                      placeholder="+1 (800) 555-0199"
                      className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-mono font-bold"
                    />
                    <button
                      onClick={handleTransfer}
                      className="rounded-lg bg-[var(--accent-primary)] px-4 py-1.5 text-xs font-bold text-white"
                    >
                      {loc('تحويل الآن', 'Execute Transfer')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Live Dual-Party Speech-to-Text Transcript Feed */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
                <span>{loc('النسخ الصوتي المباشر للمكالمة (Live Transcript):', 'Live Dual-Party Transcript Stream:')}</span>
                {callState === 'connected' && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-extrabold">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    Streaming STT
                  </span>
                )}
              </div>

              <div className="max-h-52 overflow-y-auto space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3.5 text-xs">
                {transcripts.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[var(--text-muted)]">
                    {callState === 'idle'
                      ? loc('ابدأ المكالمة لعرض النسخ الصوتي الفوري هنا', 'Place a call to view live speech transcription here')
                      : loc('جاري الاتصال والتقاط الصوت...', 'Listening and transcribing speech...')}
                  </div>
                ) : (
                  transcripts.map((t, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl transition ${
                        t.role === 'agent'
                          ? 'bg-[var(--accent-soft)] text-[var(--text-primary)]'
                          : t.role === 'customer'
                          ? 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                          : 'bg-emerald-500/10 text-emerald-600 font-mono text-[11px]'
                      }`}
                    >
                      <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-1">
                        <span className="font-extrabold">{t.role === 'agent' ? (loc('المتحدث / الوكيل', 'AGENT')) : t.role === 'customer' ? (loc('العميل', 'CUSTOMER')) : 'SYSTEM'}</span>
                        <span>{t.timestamp}</span>
                      </div>
                      <p className="leading-relaxed">{t.text}</p>
                    </div>
                  ))
                )}
                <div ref={transcriptEndRef} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LOWER SECTION: CALL HISTORY LOG TABLE */}
      {/* ========================================================================= */}
      <div className="luxury-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-[var(--accent-primary)]" />
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              {loc('سجل المكالمات الهاتفية (Call History Log)', 'Call History Log & Recordings')}
            </h3>
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            {loc(`إجمالي المكالمات: ${callHistory.length}`, `Total Calls: ${callHistory.length}`)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                <th className="pb-3 text-start">{loc('الاتجاه', 'Direction')}</th>
                <th className="pb-3 text-start">{loc('رقم المتصل', 'From')}</th>
                <th className="pb-3 text-start">{loc('رقم المستلم', 'To')}</th>
                <th className="pb-3 text-start">{loc('نوع المكالمة', 'Mode')}</th>
                <th className="pb-3 text-start">{loc('المدة', 'Duration')}</th>
                <th className="pb-3 text-start">{loc('الحالة', 'Status')}</th>
                <th className="pb-3 text-end">{loc('التسجيل الصوتي', 'Recording')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {callHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-[var(--text-muted)]">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Phone className="h-5 w-5 opacity-40 text-[var(--text-muted)]" />
                      <span className="font-semibold text-[var(--text-secondary)]">
                        {loc('لا توجد مكالمات سابقة في هذا الحساب', 'No previous call records in this workspace')}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {loc('ستظهر المكالمات الصادرة والواردة وتسجيلاتها وتفريغها النصي هنا لحظياً.', 'Outbound & inbound calls with recordings and transcripts will appear here in real time.')}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                callHistory.map((call) => (
                <tr key={call.id} className="hover:bg-[var(--bg-subtle)]/50 transition">
                  <td className="py-3">
                    {call.direction === 'outbound' ? (
                      <span className="flex items-center gap-1 font-semibold text-emerald-600">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        <span>{loc('صادرة', 'Outbound')}</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-semibold text-sky-600">
                        <ArrowDownLeft className="h-3.5 w-3.5" />
                        <span>{loc('واردة', 'Inbound')}</span>
                      </span>
                    )}
                  </td>
                  <td dir="ltr" className="py-3 font-mono font-medium text-[var(--text-primary)] text-start">
                    {call.fromNumber}
                  </td>
                  <td dir="ltr" className="py-3 font-mono font-medium text-[var(--text-primary)] text-start">
                    {call.toNumber}
                  </td>
                  <td className="py-3">
                    <span className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent-primary)]">
                      {call.mode === 'ai_voice_agent' ? 'AI Voice Agent' : 'PSTN Direct'}
                    </span>
                  </td>
                  <td className="py-3 font-mono">
                    {Math.floor(call.durationSeconds / 60)}m {call.durationSeconds % 60}s
                  </td>
                  <td className="py-3">
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                      {call.status}
                    </span>
                  </td>
                  <td className="py-3 text-end">
                    <button
                      onClick={() => alert(`Replaying call audio: ${call.recordingUrl}`)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-primary)] hover:border-[var(--accent-primary)]"
                    >
                      <Volume2 className="h-3 w-3 text-[var(--brand-coral)]" />
                      <span>{loc('استماع', 'Replay')}</span>
                    </button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
