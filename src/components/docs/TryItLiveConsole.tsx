'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Play,
  Key,
  Shield,
  Sparkles,
  RotateCcw,
  Check,
  Copy,
  Clock,
  ExternalLink,
  Download,
  AlertCircle,
  FileCode,
  Terminal,
  Activity,
  Layers,
  Code2,
} from 'lucide-react';
import type { EndpointSpec } from '@/app/docs/page';

interface TryItLiveConsoleProps {
  spec: EndpointSpec;
  isAr: boolean;
}

type AuthMode = 'bearer' | 'cookie';
type SnippetLang = 'curl' | 'javascript' | 'python';
type ResponseTab = 'formatted' | 'raw' | 'headers';

export default function TryItLiveConsole({ spec, isAr }: TryItLiveConsoleProps) {
  // Auth Mode State
  const [authMode, setAuthMode] = useState<AuthMode>('bearer');
  const [apiKey, setApiKey] = useState<string>('tk_live_org_workspace_9f8e7d6c5b4a3');
  const [sessionUser, setSessionUser] = useState<{ name: string; org: string } | null>(null);
  const [sessionLoading, setSessionLoading] = useState<boolean>(false);

  // Dynamic Parameter States
  const [pathParamValues, setPathParamValues] = useState<Record<string, string>>({});
  const [queryParamValues, setQueryParamValues] = useState<Record<string, { enabled: boolean; value: string }>>({});
  const [bodyText, setBodyText] = useState<string>('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Execution States
  const [executing, setExecuting] = useState<boolean>(false);
  const [responseMeta, setResponseMeta] = useState<{
    status: number;
    statusText: string;
    latencyMs: number;
    remaining: string;
    reqId: string;
    sizeBytes: number;
    headers: Record<string, string>;
  } | null>(null);
  const [responseData, setResponseData] = useState<unknown>(null);
  const [responseRawText, setResponseRawText] = useState<string>('');

  // UI Tabs & Clipboard
  const [activeSnippetLang, setActiveSnippetLang] = useState<SnippetLang>('curl');
  const [activeResponseTab, setActiveResponseTab] = useState<ResponseTab>('formatted');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Check Active Session Cookie on mount or when cookie mode is clicked
  useEffect(() => {
    let active = true;
    async function detectSession() {
      setSessionLoading(true);
      try {
        const res = await fetch('/api/auth?action=session', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (active && data.session?.user) {
            setSessionUser({
              name: data.session.user.fullName || data.session.user.name || 'Admin',
              org: data.session.tenant?.organizationName || 'Default Workspace',
            });
          }
        }
      } catch {
        // Fallback silently if unauthenticated or network failure
      } finally {
        if (active) setSessionLoading(false);
      }
    }
    detectSession();
    return () => {
      active = false;
    };
  }, []);

  // Parse path parameters from spec.liveApiPath (e.g. {platform}, {id}, {conversationId})
  const detectedPathTokens = useMemo(() => {
    const matches = spec.liveApiPath.match(/{([a-zA-Z0-9_-]+)}/g);
    return matches ? matches.map((m) => m.slice(1, -1)) : [];
  }, [spec.liveApiPath]);

  // Synchronize state when selected endpoint changes
  useEffect(() => {
    // 1. Initialize Path Params with smart defaults
    const newPathParams: Record<string, string> = {};
    for (const token of detectedPathTokens) {
      if (token === 'platform') newPathParams[token] = 'facebook';
      else if (token === 'id') newPathParams[token] = 'demo_resource_01';
      else if (token === 'conversationId') newPathParams[token] = 'conv_demo_01';
      else if (token === 'groupId') newPathParams[token] = 'grp_demo_01';
      else newPathParams[token] = `${token}_demo`;
    }
    setPathParamValues(newPathParams);

    // 2. Initialize Query Params
    const queryParamsList = spec.params?.filter((p) => p.in === 'query') || [];
    const newQueryParams: Record<string, { enabled: boolean; value: string }> = {};
    for (const q of queryParamsList) {
      newQueryParams[q.name] = {
        enabled: q.required,
        value: q.name === 'limit' ? '25' : q.name === 'country' ? 'US' : '',
      };
    }
    setQueryParamValues(newQueryParams);

    // 3. Initialize Body for mutating methods
    if (['POST', 'PUT', 'PATCH'].includes(spec.method)) {
      const initialPayload = spec.samplePayload && Object.keys(spec.samplePayload).length > 0 ? spec.samplePayload : {};
      setBodyText(JSON.stringify(initialPayload, null, 2));
      setJsonError(null);
    } else {
      setBodyText('');
      setJsonError(null);
    }

    // Reset previous execution output
    setResponseMeta(null);
    setResponseData(null);
    setResponseRawText('');
  }, [spec.id, spec.liveApiPath, spec.method, spec.samplePayload, detectedPathTokens]);

  // Handle JSON Body Text Change & Live Syntax Validation
  const handleBodyChange = (text: string) => {
    setBodyText(text);
    if (!text.trim()) {
      setJsonError(null);
      return;
    }
    try {
      JSON.parse(text);
      setJsonError(null);
    } catch (err) {
      setJsonError((err as Error).message);
    }
  };

  // Format JSON
  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(bodyText);
      setBodyText(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch (err) {
      setJsonError((err as Error).message);
    }
  };

  // Reset JSON to Sample
  const handleResetSample = () => {
    setBodyText(JSON.stringify(spec.samplePayload || {}, null, 2));
    setJsonError(null);
  };

  // Compute Active URL (Path + Query string)
  const computedApiPath = useMemo(() => {
    let resolved = spec.liveApiPath;
    for (const token of detectedPathTokens) {
      const val = pathParamValues[token] || `{${token}}`;
      resolved = resolved.replace(`{${token}}`, encodeURIComponent(val));
    }
    const queryEntries: string[] = [];
    for (const [key, qState] of Object.entries(queryParamValues)) {
      if (qState.enabled && qState.value.trim()) {
        queryEntries.push(`${encodeURIComponent(key)}=${encodeURIComponent(qState.value.trim())}`);
      }
    }
    return queryEntries.length > 0 ? `${resolved}?${queryEntries.join('&')}` : resolved;
  }, [spec.liveApiPath, detectedPathTokens, pathParamValues, queryParamValues]);

  // Copy helper
  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setCopiedId(null);
    }
  };

  // Live Request Execution
  const handleExecuteRequest = async () => {
    if (jsonError) return;
    setExecuting(true);
    const startMs = performance.now();
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authMode === 'bearer') {
        headers['Authorization'] = `Bearer ${apiKey.trim() || 'tk_live_org_workspace_9f8e7d6c5b4a3'}`;
      }

      const hasBody = ['POST', 'PUT', 'PATCH'].includes(spec.method) && bodyText.trim().length > 0;
      const res = await fetch(computedApiPath, {
        method: spec.method,
        headers,
        credentials: authMode === 'cookie' ? 'include' : 'same-origin',
        body: hasBody ? bodyText : undefined,
      });

      const latencyMs = Math.round(performance.now() - startMs);
      const resHeaders: Record<string, string> = {};
      res.headers.forEach((val, key) => {
        resHeaders[key] = val;
      });

      const rawText = await res.text();
      setResponseRawText(rawText);
      let parsedJson: unknown = null;
      try {
        parsedJson = JSON.parse(rawText);
        setResponseData(parsedJson);
      } catch {
        setResponseData(rawText);
      }

      setResponseMeta({
        status: res.status,
        statusText: res.statusText || (res.status === 200 ? 'OK' : res.status === 201 ? 'Created' : 'Response'),
        latencyMs,
        remaining: res.headers.get('X-RateLimit-Remaining') || '119',
        reqId: res.headers.get('X-Techurity-Request-Id') || 'req_live',
        sizeBytes: new Blob([rawText]).size,
        headers: resHeaders,
      });
    } catch (err) {
      const latencyMs = Math.round(performance.now() - startMs);
      setResponseMeta({
        status: 0,
        statusText: 'Network Error',
        latencyMs,
        remaining: '0',
        reqId: 'err_client',
        sizeBytes: 0,
        headers: {},
      });
      setResponseData({ error: (err as Error).message });
      setResponseRawText((err as Error).message);
    } finally {
      setExecuting(false);
    }
  };

  // Reactive Multi-Language Code Snippets Generator
  const reactiveSnippets = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://techurity.si';
    const fullUrl = `${origin}${computedApiPath}`;
    const hasBody = ['POST', 'PUT', 'PATCH'].includes(spec.method) && bodyText.trim().length > 0;

    // 1. cURL Snippet
    let curl = `curl -X ${spec.method} "${fullUrl}" \\\n`;
    if (authMode === 'bearer') {
      curl += `  -H "Authorization: Bearer ${apiKey.trim() || 'tk_live_org_workspace_9f8e7d6c5b4a3'}" \\\n`;
    } else {
      curl += `  --cookie "techurity_session=<active_session_cookie>" \\\n`;
    }
    curl += `  -H "Content-Type: application/json"`;
    if (hasBody) {
      curl += ` \\\n  -d '${bodyText.replace(/'/g, "'\\''")}'`;
    }

    // 2. JavaScript Fetch Snippet
    let js = `// Techurity & Zernio API v1 — JavaScript Fetch\n`;
    js += `const response = await fetch('${fullUrl}', {\n`;
    js += `  method: '${spec.method}',\n`;
    js += `  headers: {\n`;
    if (authMode === 'bearer') {
      js += `    'Authorization': 'Bearer ${apiKey.trim() || 'tk_live_org_workspace_9f8e7d6c5b4a3'}',\n`;
    }
    js += `    'Content-Type': 'application/json',\n`;
    js += `  },\n`;
    if (authMode === 'cookie') {
      js += `  credentials: 'include', // Automatically passes active techurity_session cookie\n`;
    }
    if (hasBody) {
      js += `  body: JSON.stringify(${bodyText}),\n`;
    }
    js += `});\n\n`;
    js += `const result = await response.json();\n`;
    js += `console.log(result);`;

    // 3. Python Requests Snippet
    let py = `# Techurity & Zernio API v1 — Python Requests\n`;
    py += `import requests\n\n`;
    py += `url = "${fullUrl}"\n`;
    py += `headers = {\n`;
    if (authMode === 'bearer') {
      py += `    "Authorization": "Bearer ${apiKey.trim() || 'tk_live_org_workspace_9f8e7d6c5b4a3'}",\n`;
    }
    py += `    "Content-Type": "application/json",\n`;
    py += `}\n`;
    if (authMode === 'cookie') {
      py += `cookies = {"techurity_session": "<active_session_cookie>"}\n`;
    }
    if (hasBody) {
      py += `payload = ${bodyText}\n\n`;
    } else {
      py += `\n`;
    }
    py += `response = requests.${spec.method.toLowerCase()}(\n`;
    py += `    url,\n`;
    py += `    headers=headers,\n`;
    if (authMode === 'cookie') {
      py += `    cookies=cookies,\n`;
    }
    if (hasBody) {
      py += `    json=payload,\n`;
    }
    py += `)\n\n`;
    py += `print(response.status_code, response.json())`;

    return { curl, javascript: js, python: py };
  }, [computedApiPath, spec.method, authMode, apiKey, bodyText]);

  // Format bytes for payload size display
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="space-y-6">
      {/* 1. TRY IT LIVE CONSOLE CONTAINER */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 shadow-md">
        {/* Header HUD */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
              <Terminal className="h-4 w-4" />
            </div>
            <div>
              <span className="font-mono text-xs font-extrabold tracking-wider uppercase text-[var(--text-primary)]">
                {isAr ? 'منصة التجربة الحية التفاعلية' : 'Try It Live Execution Console'}
              </span>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-[11px] text-[var(--text-muted)]">
                  Live Gateway: <code className="text-emerald-400">/api/v1</code>
                </span>
              </div>
            </div>
          </div>

          {/* Direct Spec Export Links */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/api/v1/openapi.json"
              target="_blank"
              download="zernio-openapi-3.1.json"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-2.5 py-1 font-mono text-[11px] font-bold text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors cursor-pointer"
            >
              <Download className="h-3 w-3" />
              <span>OpenAPI 3.1</span>
            </Link>
            <Link
              href="/api/v1/postman.json"
              target="_blank"
              download="zernio-postman-collection.json"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-2.5 py-1 font-mono text-[11px] font-bold text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors cursor-pointer"
            >
              <Download className="h-3 w-3" />
              <span>Postman 2.1</span>
            </Link>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {/* 2. DUAL AUTHENTICATION SWITCHER */}
          <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                {isAr ? 'نمط المصادقة المزدوج (Dual Authentication Mode)' : 'Authentication Mode'}
              </span>

              {/* Mode Toggle Pills */}
              <div className="inline-flex rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setAuthMode('bearer')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 font-bold transition-all cursor-pointer ${
                    authMode === 'bearer'
                      ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Key className="h-3 w-3" />
                  <span>{isAr ? 'مفتاح Bearer API Key' : 'Bearer API Key'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('cookie')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 font-bold transition-all cursor-pointer ${
                    authMode === 'cookie'
                      ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Shield className="h-3 w-3" />
                  <span>{isAr ? 'جلسة المتصفح (Session Cookie)' : 'Active Session Cookie'}</span>
                </button>
              </div>
            </div>

            {/* Bearer Input View */}
            {authMode === 'bearer' ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[260px]">
                    <input
                      dir="ltr"
                      type="text"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="tk_live_..."
                      className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 font-mono text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(apiKey, 'apiKey')}
                    className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    {copiedId === 'apiKey' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedId === 'apiKey' ? (isAr ? 'تم النسخ' : 'Copied') : isAr ? 'نسخ' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setApiKey('tk_live_org_workspace_9f8e7d6c5b4a3')}
                    className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>{isAr ? 'المفتاح الافتراضي' : 'Default'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {isAr
                    ? 'يتم إرسال المفتاح عبر ترويسة Authorization: Bearer tk_live_... وله صلاحية full_access.'
                    : 'Dispatches header Authorization: Bearer tk_live_... with full_access scopes.'}
                </p>
              </div>
            ) : (
              /* Session Cookie View */
              <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`flex h-2.5 w-2.5 rounded-full ${sessionUser ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className="font-bold text-[var(--text-primary)]">
                    {sessionLoading
                      ? isAr ? 'جاري فحص جلسة المتصفح...' : 'Detecting browser session...'
                      : sessionUser
                      ? isAr
                        ? `جلسة متصفح نشطة: ${sessionUser.name} (${sessionUser.org})`
                        : `Active Session: ${sessionUser.name} (${sessionUser.org})`
                      : isAr
                      ? 'لا توجد جلسة متصفح نشطة مسجلة حالياً'
                      : 'No active browser session detected'}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  {isAr
                    ? 'في هذا النمط، تُرسل الطلبات بدون ترويسة Authorization مع تفعيل credentials: "include"، ليتم التحقق تلقائياً من كوكي techurity_session.'
                    : 'Requests dispatch without Authorization header using credentials: "include", authenticating via the browser\'s techurity_session cookie.'}
                </p>
              </div>
            )}
          </div>

          {/* 3. DYNAMIC PARAMETERS & TARGET URL */}
          <div className="space-y-4">
            {/* Computed URL Bar */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {isAr ? 'مسار الطلب النهائي (Resolved Endpoint URL)' : 'Resolved Endpoint URL'}
              </span>
              <div
                dir="ltr"
                className="flex items-center justify-between gap-3 overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-slate-950 px-3.5 py-2.5 font-mono text-xs text-slate-200"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-extrabold uppercase ${
                      spec.method === 'GET'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : spec.method === 'POST'
                        ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                        : spec.method === 'PUT'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : spec.method === 'DELETE'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    }`}
                  >
                    {spec.method}
                  </span>
                  <span className="text-slate-100 font-bold">{computedApiPath}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(computedApiPath, 'computedUrl')}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Copy Path"
                >
                  {copiedId === 'computedUrl' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Path Parameters Inputs (if any) */}
            {detectedPathTokens.length > 0 && (
              <div className="space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  {isAr ? 'معاملات المسار (Path Parameters)' : 'Path Parameters'}
                </span>
                <div className="grid gap-3 sm:grid-cols-2">
                  {detectedPathTokens.map((token) => (
                    <div key={token} className="space-y-1">
                      <label className="font-mono text-xs font-bold text-[var(--accent-primary)]">
                        {`{${token}}`}
                      </label>
                      <input
                        dir="ltr"
                        type="text"
                        value={pathParamValues[token] || ''}
                        onChange={(e) =>
                          setPathParamValues((prev) => ({ ...prev, [token]: e.target.value }))
                        }
                        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-2.5 py-1.5 font-mono text-xs text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Query Parameters Inputs (if any) */}
            {Object.keys(queryParamValues).length > 0 && (
              <div className="space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  {isAr ? 'معاملات الاستعلام (Query Parameters)' : 'Query Parameters'}
                </span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(queryParamValues).map(([key, qState]) => (
                    <div key={key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={qState.enabled}
                        onChange={(e) =>
                          setQueryParamValues((prev) => ({
                            ...prev,
                            [key]: { ...prev[key], enabled: e.target.checked },
                          }))
                        }
                        className="rounded border-[var(--border-subtle)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                      />
                      <label className="font-mono text-xs font-bold text-[var(--text-secondary)] min-w-[70px]">
                        {key}:
                      </label>
                      <input
                        dir="ltr"
                        type="text"
                        value={qState.value}
                        onChange={(e) =>
                          setQueryParamValues((prev) => ({
                            ...prev,
                            [key]: { ...prev[key], value: e.target.value },
                          }))
                        }
                        className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-2 py-1 font-mono text-xs text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Request Body JSON Editor (for POST/PUT/PATCH) */}
            {['POST', 'PUT', 'PATCH'].includes(spec.method) && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      {isAr ? 'محرر جسم الطلب (Request Body JSON)' : 'Request Body (JSON Editor)'}
                    </span>
                    {jsonError ? (
                      <span className="inline-flex items-center gap-1 rounded bg-rose-500/15 px-2 py-0.5 text-[10px] font-extrabold text-rose-400">
                        <AlertCircle className="h-3 w-3" />
                        {jsonError}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold text-emerald-400">
                        <Check className="h-3 w-3" />
                        {isAr ? 'JSON صالح' : 'Valid JSON'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleFormatJson}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      <Sparkles className="h-3 w-3 text-amber-400" />
                      <span>{isAr ? 'تنسيق JSON' : 'Format JSON'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetSample}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>{isAr ? 'إعادة للنموذج' : 'Reset Sample'}</span>
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    dir="ltr"
                    rows={8}
                    value={bodyText}
                    onChange={(e) => handleBodyChange(e.target.value)}
                    className="w-full rounded-2xl border border-[var(--border-subtle)] bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100 placeholder-slate-500 focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                    placeholder="{}"
                  />
                </div>
              </div>
            )}

            {/* Execute Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={executing || !!jsonError}
                onClick={handleExecuteRequest}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-6 py-3 text-sm font-extrabold text-white shadow-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-all cursor-pointer"
              >
                <Play className="h-4 w-4 fill-white" />
                <span>
                  {executing
                    ? isAr
                      ? 'جاري إرسال الطلب وتنفيذ /api/v1...'
                      : 'Executing Live /api/v1 Request...'
                    : isAr
                    ? `إرسال الطلب (${spec.method} ${spec.path})`
                    : `Execute Live Request (${spec.method})`}
                </span>
              </button>
            </div>
          </div>

          {/* 4. REAL-TIME RESPONSE HUD & DATA VIEWER */}
          {responseMeta && (
            <div className="space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5">
              {/* Response Status Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Status Badge */}
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-xs font-extrabold ${
                      responseMeta.status >= 200 && responseMeta.status < 300
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : responseMeta.status >= 300 && responseMeta.status < 400
                        ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                        : responseMeta.status >= 400 && responseMeta.status < 500
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    <span>HTTP {responseMeta.status}</span>
                    <span>{responseMeta.statusText}</span>
                  </span>

                  {/* Latency Pill */}
                  <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-2.5 py-1 font-mono text-xs text-[var(--text-secondary)]">
                    <Clock className="h-3 w-3 text-amber-400" />
                    <span>{responseMeta.latencyMs} ms</span>
                  </span>

                  {/* Size Pill */}
                  <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-2.5 py-1 font-mono text-xs text-[var(--text-secondary)]">
                    <span>📦 {formatBytes(responseMeta.sizeBytes)}</span>
                  </span>
                </div>

                {/* Rate Limit & Request ID */}
                <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-[var(--text-muted)]">
                  <span className="text-emerald-400">
                    Remaining: {responseMeta.remaining}/120
                  </span>
                  <span>•</span>
                  <span>ID: {responseMeta.reqId}</span>
                </div>
              </div>

              {/* Response Tabs & Copy */}
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                <div className="flex items-center gap-1">
                  {(['formatted', 'raw', 'headers'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveResponseTab(tab)}
                      className={`rounded-lg px-3 py-1 text-xs font-bold transition-colors cursor-pointer ${
                        activeResponseTab === tab
                          ? 'bg-[var(--accent-primary)] text-white'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {tab === 'formatted'
                        ? isAr ? 'استجابة JSON المنسقة' : 'Formatted JSON'
                        : tab === 'raw'
                        ? isAr ? 'النص الخام' : 'Raw Text'
                        : isAr ? 'ترويسات الاستجابة' : 'Headers'}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      activeResponseTab === 'formatted'
                        ? JSON.stringify(responseData, null, 2)
                        : activeResponseTab === 'raw'
                        ? responseRawText
                        : JSON.stringify(responseMeta.headers, null, 2),
                      'response'
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-2.5 py-1 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  {copiedId === 'response' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedId === 'response' ? (isAr ? 'تم النسخ' : 'Copied') : isAr ? 'نسخ الاستجابة' : 'Copy'}</span>
                </button>
              </div>

              {/* Response Content View */}
              {activeResponseTab === 'formatted' && (
                <pre
                  dir="ltr"
                  className="max-h-96 overflow-auto rounded-xl border border-[var(--border-subtle)] bg-slate-950 p-4 font-mono text-xs leading-relaxed text-emerald-300"
                >
                  {JSON.stringify(responseData, null, 2)}
                </pre>
              )}

              {activeResponseTab === 'raw' && (
                <pre
                  dir="ltr"
                  className="max-h-96 overflow-auto rounded-xl border border-[var(--border-subtle)] bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-200 whitespace-pre-wrap"
                >
                  {responseRawText}
                </pre>
              )}

              {activeResponseTab === 'headers' && (
                <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
                  <table className="w-full text-xs text-start">
                    <thead className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">
                      <tr>
                        <th className="p-2.5 font-bold">{isAr ? 'الترويسة' : 'Header'}</th>
                        <th className="p-2.5 font-bold">{isAr ? 'القيمة' : 'Value'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)] font-mono text-[11px]">
                      {Object.entries(responseMeta.headers).map(([k, v]) => (
                        <tr key={k}>
                          <td className="p-2.5 font-bold text-[var(--text-primary)]">{k}</td>
                          <td className="p-2.5 text-[var(--accent-primary)] break-all">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 5. REACTIVE MULTI-LANGUAGE CODE SNIPPETS */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-[var(--accent-primary)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {isAr ? 'أمثلة الأكواد البرمجية التفاعلية (Reactive Snippets)' : 'Reactive Code Snippets'}
                </span>
              </div>

              {/* Snippet Language Switcher */}
              <div className="inline-flex rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5 text-xs">
                {(
                  [
                    { id: 'curl', label: 'cURL' },
                    { id: 'javascript', label: 'JavaScript (Fetch)' },
                    { id: 'python', label: 'Python (Requests)' },
                  ] as const
                ).map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setActiveSnippetLang(lang.id)}
                    className={`rounded-md px-3 py-1 font-bold transition-all cursor-pointer ${
                      activeSnippetLang === lang.id
                        ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            <div
              dir="ltr"
              className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-slate-950 text-slate-100 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-2">
                <span className="font-mono text-xs font-bold text-slate-300">
                  {activeSnippetLang === 'curl' ? 'cURL Terminal' : activeSnippetLang === 'javascript' ? 'JavaScript ES2022' : 'Python 3'}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      activeSnippetLang === 'curl'
                        ? reactiveSnippets.curl
                        : activeSnippetLang === 'javascript'
                        ? reactiveSnippets.javascript
                        : reactiveSnippets.python,
                      'snippet'
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                >
                  {copiedId === 'snippet' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedId === 'snippet' ? (isAr ? 'تم النسخ' : 'Copied') : isAr ? 'نسخ الكود' : 'Copy Code'}</span>
                </button>
              </div>

              <pre className="max-h-80 overflow-auto p-4 font-mono text-xs leading-relaxed text-sky-300 whitespace-pre">
                {activeSnippetLang === 'curl'
                  ? reactiveSnippets.curl
                  : activeSnippetLang === 'javascript'
                  ? reactiveSnippets.javascript
                  : reactiveSnippets.python}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
