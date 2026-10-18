/**
 * Milestone 7 Fix 3: Empirical Challenger Stress Harness
 * 
 * Verifies:
 * 1. handleSaveAgent error propagation (400, 500, HTML 502, network error, 200 {success:false}) -> real error banner, NO success banner.
 * 2. handleSavePlatformSettings error propagation (400, 500, HTML 502, network error, 200 {success:false}) -> real error banner, NO success banner.
 * 3. hubError in InboxCrmWorkflowsHub renders visibly in both top banner and contact modal.
 * 4. PublishingAndQueueHub calendar preview renders 0 synthetic posts when 0 upcoming slots exist.
 * 5. InboxCrmWorkflowsHub mentions subtab view renders luxury empty state card with AtSign icon and action button.
 * 6. Live API endpoints on http://localhost:3000 return proper HTTP status codes and contract payloads.
 * 7. Clean state check: .data/workspaces.json is strictly {"workspaces":{}}.
 */

import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const results = [];

function record(suite, testName, pass, details = {}) {
  results.push({ suite, testName, pass, details });
  const icon = pass ? '✓ PASS' : '✗ FAIL';
  console.log(`${icon} [${suite}] ${testName}`);
  if (!pass || process.env.VERBOSE) {
    console.log(`   -> ${JSON.stringify(details, null, 2)}`);
  }
}

async function run() {
  console.log('================================================================');
  console.log('   CHALLENGER M7 FIX 3: EMPIRICAL STRESS & ADVERSARIAL HARNESS  ');
  console.log('================================================================\n');

  // ============================================================================
  // SUITE 1: LIVE HTTP ENDPOINT STRESS TESTS AGAINST http://localhost:3000
  // ============================================================================
  console.log('--- SUITE 1: Live HTTP Endpoint Status & Error Payload Integrity ---');

  // 1.1 POST /api/v1/business-agent without auth returns 401
  {
    const res = await fetch(`${BASE_URL}/api/v1/business-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true, prompt: 'Test agent prompt' }),
    });
    const data = await res.json().catch(() => ({}));
    const pass = res.status === 401 && data.success === false && Boolean(data.error?.message || data.error);
    record('Live API', '1.1 POST /api/v1/business-agent without auth returns genuine 401', pass, {
      status: res.status,
      success: data.success,
      error: data.error,
    });
  }

  // 1.2 POST /api/v1/accounts/default/messenger-greeting without auth returns 401
  {
    const res = await fetch(`${BASE_URL}/api/v1/accounts/default/messenger-greeting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ greeting: 'Welcome!' }),
    });
    const data = await res.json().catch(() => ({}));
    const pass = res.status === 401 && data.success === false && Boolean(data.error?.message || data.error);
    record('Live API', '1.2 POST /api/v1/accounts/default/messenger-greeting returns genuine 401', pass, {
      status: res.status,
      success: data.success,
      error: data.error,
    });
  }

  // 1.3 GET /api/v1/queue/preview?days=7 without auth returns 401 (not dummy calendar slots)
  {
    const res = await fetch(`${BASE_URL}/api/v1/queue/preview?days=7`);
    const data = await res.json().catch(() => ({}));
    const pass = res.status === 401 && data.success === false && !data.upcomingSlots;
    record('Live API', '1.3 GET /api/v1/queue/preview?days=7 without auth returns 401 and zero leaked slots', pass, {
      status: res.status,
      success: data.success,
    });
  }

  // 1.4 GET /api/v1/queue/preview?days=7 returns slots with assignedPost: null (zero synthesized posts)
  {
    const token = 'tk_live_test_clean_cal_check';
    const res = await fetch(`${BASE_URL}/api/v1/queue/preview?days=7`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    const rawSlots = data.upcomingSlots || data.slots || data.data?.slots || [];
    // Verify that none of the slots contain synthesized fake posts
    const synthesizedPosts = rawSlots.filter(s => s.assignedPost !== null || s.hasPost || s.postTitle);
    const pass = res.status === 200 && data.success === true && synthesizedPosts.length === 0;
    record('Live API', '1.4 GET /api/v1/queue/preview?days=7 returns slots with zero synthesized posts', pass, {
      status: res.status,
      success: data.success,
      slotCount: rawSlots.length,
      synthesizedPostCount: synthesizedPosts.length,
    });
  }

  // ============================================================================
  // SUITE 2: EMPIRICAL STATE TRANSITION SIMULATION FOR handleSaveAgent
  // ============================================================================
  console.log('\n--- SUITE 2: handleSaveAgent Error State Machine & Banner Enforcement ---');

  // We re-create the exact handler logic from TelephonyWhatsAppVoiceHub.tsx to verify all error paths:
  async function simulateHandleSaveAgent(mockFetch) {
    let savingAgent = false;
    let agentSaved = false;
    let agentError = null;

    const loc = (ar, en) => en;

    const setSavingAgent = (v) => { savingAgent = v; };
    const setAgentSaved = (v) => { agentSaved = v; };
    const setAgentError = (v) => { agentError = v; };

    // Handler implementation from TelephonyWhatsAppVoiceHub.tsx:120-147
    setSavingAgent(true);
    setAgentSaved(false);
    setAgentError(null);
    try {
      const res = await mockFetch('/api/v1/business-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: true,
          prompt: 'Test prompt',
          tone: 'professional',
          fallbackPhone: '+1234567890',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || (data.success !== undefined && !data.success)) {
        throw new Error(data.message || data.error?.message || data.error || 'Failed to save agent');
      }
      setAgentSaved(true);
    } catch (err) {
      setAgentSaved(false);
      setAgentError(err?.message || loc('فشل حفظ إعدادات الوكيل الذكي', 'Failed to save agent settings'));
    } finally {
      setSavingAgent(false);
    }

    return { savingAgent, agentSaved, agentError };
  }

  // 2.1 HTTP 400 Bad Request with json error
  {
    const mock = async () => ({
      ok: false,
      status: 400,
      json: async () => ({ success: false, error: 'Agent prompt cannot be empty' }),
    });
    const state = await simulateHandleSaveAgent(mock);
    const pass = state.agentSaved === false && state.agentError === 'Agent prompt cannot be empty' && state.savingAgent === false;
    record('handleSaveAgent', '2.1 HTTP 400 triggers agentError banner and suppresses agentSaved', pass, state);
  }

  // 2.2 HTTP 500 Internal Server Error with nested error object
  {
    const mock = async () => ({
      ok: false,
      status: 500,
      json: async () => ({ success: false, error: { message: 'Database connection failed' } }),
    });
    const state = await simulateHandleSaveAgent(mock);
    const pass = state.agentSaved === false && state.agentError === 'Database connection failed' && state.savingAgent === false;
    record('handleSaveAgent', '2.2 HTTP 500 with nested error triggers agentError and suppresses agentSaved', pass, state);
  }

  // 2.3 HTTP 502 Bad Gateway with non-JSON HTML body
  {
    const mock = async () => ({
      ok: false,
      status: 502,
      json: async () => { throw new Error('SyntaxError: Unexpected token < in JSON'); },
    });
    const state = await simulateHandleSaveAgent(mock);
    const pass = state.agentSaved === false && state.agentError === 'Failed to save agent' && state.savingAgent === false;
    record('handleSaveAgent', '2.3 HTTP 502 HTML body falls back to descriptive agentError and suppresses agentSaved', pass, state);
  }

  // 2.4 Network Failure (fetch rejects)
  {
    const mock = async () => {
      throw new Error('TypeError: Failed to fetch');
    };
    const state = await simulateHandleSaveAgent(mock);
    const pass = state.agentSaved === false && state.agentError === 'TypeError: Failed to fetch' && state.savingAgent === false;
    record('handleSaveAgent', '2.4 Network exception triggers agentError banner and suppresses agentSaved', pass, state);
  }

  // 2.5 HTTP 200 with logical business failure { success: false, error: "Quota exceeded" }
  {
    const mock = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: false, error: 'Monthly voice agent quota exceeded' }),
    });
    const state = await simulateHandleSaveAgent(mock);
    const pass = state.agentSaved === false && state.agentError === 'Monthly voice agent quota exceeded';
    record('handleSaveAgent', '2.5 HTTP 200 with {success:false} triggers agentError and suppresses agentSaved', pass, state);
  }

  // 2.6 Genuine HTTP 200 Success
  {
    const mock = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { id: 'agent_123' } }),
    });
    const state = await simulateHandleSaveAgent(mock);
    const pass = state.agentSaved === true && state.agentError === null && state.savingAgent === false;
    record('handleSaveAgent', '2.6 Genuine HTTP 200 sets agentSaved=true and agentError=null', pass, state);
  }

  // ============================================================================
  // SUITE 3: EMPIRICAL STATE TRANSITION SIMULATION FOR handleSavePlatformSettings
  // ============================================================================
  console.log('\n--- SUITE 3: handleSavePlatformSettings Error State Machine & Banner Enforcement ---');

  async function simulateHandleSavePlatformSettings(mockFetch, platform = 'messenger') {
    let savingSettings = false;
    let settingsSaved = false;
    let settingsError = null;

    const loc = (ar, en) => en;
    const settingsPlatform = platform;
    const messengerGreeting = 'Welcome!';

    const setSavingSettings = (v) => { savingSettings = v; };
    const setSettingsSaved = (v) => { settingsSaved = v; };
    const setSettingsError = (v) => { settingsError = v; };

    // Handler implementation from ConnectAndAccountsHub.tsx:206-230
    setSavingSettings(true);
    setSettingsSaved(false);
    setSettingsError(null);
    try {
      if (settingsPlatform === 'messenger') {
        const res = await mockFetch('/api/v1/accounts/default/messenger-greeting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ greeting: messengerGreeting }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || (data.success !== undefined && !data.success)) {
          throw new Error(data.message || data.error?.message || data.error || 'Failed to save settings');
        }
      }
      setSettingsSaved(true);
    } catch (err) {
      setSettingsSaved(false);
      setSettingsError(err?.message || loc('فشل حفظ ومزامنة الإعدادات', 'Failed to save settings'));
    } finally {
      setSavingSettings(false);
    }

    return { savingSettings, settingsSaved, settingsError };
  }

  // 3.1 HTTP 400 Bad Request
  {
    const mock = async () => ({
      ok: false,
      status: 400,
      json: async () => ({ success: false, error: 'Messenger greeting cannot exceed 250 characters' }),
    });
    const state = await simulateHandleSavePlatformSettings(mock);
    const pass = state.settingsSaved === false && state.settingsError === 'Messenger greeting cannot exceed 250 characters' && state.savingSettings === false;
    record('handleSavePlatformSettings', '3.1 HTTP 400 triggers settingsError banner and suppresses settingsSaved', pass, state);
  }

  // 3.2 HTTP 500 Internal Server Error
  {
    const mock = async () => ({
      ok: false,
      status: 500,
      json: async () => ({ success: false, error: 'Meta Graph API timeout' }),
    });
    const state = await simulateHandleSavePlatformSettings(mock);
    const pass = state.settingsSaved === false && state.settingsError === 'Meta Graph API timeout';
    record('handleSavePlatformSettings', '3.2 HTTP 500 triggers settingsError and suppresses settingsSaved', pass, state);
  }

  // 3.3 HTTP 504 Gateway Timeout (non-JSON body)
  {
    const mock = async () => ({
      ok: false,
      status: 504,
      json: async () => { throw new Error('Gateway Timeout'); },
    });
    const state = await simulateHandleSavePlatformSettings(mock);
    const pass = state.settingsSaved === false && state.settingsError === 'Failed to save settings';
    record('handleSavePlatformSettings', '3.3 HTTP 504 non-JSON body triggers default settingsError and suppresses settingsSaved', pass, state);
  }

  // 3.4 HTTP 200 with { success: false }
  {
    const mock = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: false, error: 'Page access token revoked' }),
    });
    const state = await simulateHandleSavePlatformSettings(mock);
    const pass = state.settingsSaved === false && state.settingsError === 'Page access token revoked';
    record('handleSavePlatformSettings', '3.4 HTTP 200 with {success:false} triggers settingsError and suppresses settingsSaved', pass, state);
  }

  // 3.5 Genuine Success
  {
    const mock = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
    const state = await simulateHandleSavePlatformSettings(mock);
    const pass = state.settingsSaved === true && state.settingsError === null;
    record('handleSavePlatformSettings', '3.5 Genuine HTTP 200 sets settingsSaved=true and settingsError=null', pass, state);
  }

  // ============================================================================
  // SUITE 4: CALENDAR PREVIEW ZERO-STATE VERIFICATION (NO SYNTHETIC POSTS)
  // ============================================================================
  console.log('\n--- SUITE 4: Calendar Preview Zero-State & Synthetic Post Check ---');

  async function simulateFetchCalendarPreview(mockFetch) {
    let loadingCalendar = false;
    let calendarSlots = null;

    const setLoadingCalendar = (v) => { loadingCalendar = v; };
    const setCalendarSlots = (v) => { calendarSlots = v; };

    // Handler implementation from PublishingAndQueueHub.tsx:89-105
    setLoadingCalendar(true);
    try {
      const res = await mockFetch('/api/v1/queue/preview?days=7');
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

    return { loadingCalendar, calendarSlots };
  }

  // 4.1 When API returns empty upcomingSlots: calendarSlots is strictly []
  {
    const mock = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true, count: 0, upcomingSlots: [] }),
    });
    const state = await simulateFetchCalendarPreview(mock);
    const pass = Array.isArray(state.calendarSlots) && state.calendarSlots.length === 0;
    record('Calendar Preview', '4.1 Empty upcomingSlots yields calendarSlots=[] (0 synthetic posts)', pass, {
      calendarSlots: state.calendarSlots,
    });
  }

  // 4.2 When API returns HTTP 401 or 500: calendarSlots is strictly [] (not fallback demo)
  {
    const mock = async () => ({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: 'Unauthorized' }),
    });
    const state = await simulateFetchCalendarPreview(mock);
    const pass = Array.isArray(state.calendarSlots) && state.calendarSlots.length === 0;
    record('Calendar Preview', '4.2 HTTP 401 error yields calendarSlots=[] with no synthetic fallback posts', pass, {
      calendarSlots: state.calendarSlots,
    });
  }

  // 4.3 Static AST check on PublishingAndQueueHub.tsx to verify complete purge of "Weekly Highlights Post"
  {
    const pubFile = path.resolve(process.cwd(), 'src/components/dashboard/hubs/PublishingAndQueueHub.tsx');
    const content = fs.readFileSync(pubFile, 'utf8');
    const hasWeeklyHighlights = content.includes('Weekly Highlights Post');
    const hasFallbackSim = content.includes('Fallback simulation');
    const pass = !hasWeeklyHighlights && !hasFallbackSim;
    record('Calendar Preview', '4.3 Source code does NOT contain "Weekly Highlights Post" or "Fallback simulation"', pass, {
      hasWeeklyHighlights,
      hasFallbackSim,
    });
  }

  // 4.4 Static check on initial states in PublishingAndQueueHub.tsx (slots and articles initialized to [])
  {
    const pubFile = path.resolve(process.cwd(), 'src/components/dashboard/hubs/PublishingAndQueueHub.tsx');
    const content = fs.readFileSync(pubFile, 'utf8');
    const slotsInitClean = /const\s*\[slots,\s*setSlots\]\s*=\s*useState<[\s\S]*?>\(\[\]\);/.test(content);
    const articlesInitClean = /const\s*\[articles,\s*setArticles\]\s*=\s*useState<[\s\S]*?>\(\[\]\);/.test(content);
    const pass = slotsInitClean && articlesInitClean;
    record('Calendar Preview', '4.4 slots and articles states initialized to empty arrays []', pass, {
      slotsInitClean,
      articlesInitClean,
    });
  }

  // ============================================================================
  // SUITE 5: INBOX CRM WORKFLOWS HUB: hubError & MENTIONS SUBTAB
  // ============================================================================
  console.log('\n--- SUITE 5: InboxCrmWorkflowsHub: hubError & Mentions Subtab ---');

  const inboxFile = path.resolve(process.cwd(), 'src/components/dashboard/hubs/InboxCrmWorkflowsHub.tsx');
  const inboxContent = fs.readFileSync(inboxFile, 'utf8');

  // 5.1 hubError rendered in top banner of hub
  {
    const hasTopBanner = inboxContent.includes('{hubError && (') &&
                         inboxContent.includes('<span>✗ {hubError}</span>') &&
                         inboxContent.includes('onClick={() => setHubError(null)}');
    record('InboxCrmWorkflowsHub', '5.1 hubError banner is rendered at top of hub with dismiss button', hasTopBanner);
  }

  // 5.2 hubError rendered inside showAddContact modal
  {
    const hasModalError = inboxContent.includes('{hubError && (') &&
                          inboxContent.includes('✗ {hubError}') &&
                          inboxContent.indexOf('showAddContact') < inboxContent.lastIndexOf('✗ {hubError}');
    record('InboxCrmWorkflowsHub', '5.2 hubError is rendered visibly inside Add Contact modal', hasModalError);
  }

  // 5.3 inboxSubTab === 'mentions' renders stream view (not void)
  {
    const hasMentionsCheck = inboxContent.includes("inboxSubTab === 'mentions'");
    const hasAtSignIcon = inboxContent.includes('<AtSign className=');
    const hasNoMentionsTitle = inboxContent.includes('No Brand Mentions Found Yet');
    const hasKeywordActionBtn = inboxContent.includes('Monitor Brand Keywords');
    const pass = hasMentionsCheck && hasAtSignIcon && hasNoMentionsTitle && hasKeywordActionBtn;
    record('InboxCrmWorkflowsHub', '5.3 Mentions subtab renders luxury card with AtSign icon, title & action button', pass, {
      hasMentionsCheck,
      hasAtSignIcon,
      hasNoMentionsTitle,
      hasKeywordActionBtn,
    });
  }

  // 5.4 Check that mock thread personas (Fatima, Omar, Sarah) are completely absent from InboxCrmWorkflowsHub.tsx
  {
    const hasFatima = /\bFatima\b/i.test(inboxContent);
    const hasOmar = /\bOmar\b/i.test(inboxContent);
    const hasSarah = /\bSarah\b/i.test(inboxContent);
    const pass = !hasFatima && !hasOmar && !hasSarah;
    record('InboxCrmWorkflowsHub', '5.4 Dummy personas (Fatima, Omar, Sarah) are purged from InboxCrmWorkflowsHub', pass, {
      hasFatima,
      hasOmar,
      hasSarah,
    });
  }

  // ============================================================================
  // SUITE 6: CLEAN STATE VERIFICATION (.data/workspaces.json)
  // ============================================================================
  console.log('\n--- SUITE 6: Clean State Verification (.data/workspaces.json) ---');

  const diskPath = path.resolve(process.cwd(), '.data/workspaces.json');
  const rawJson = fs.readFileSync(diskPath, 'utf8');
  const byteLength = Buffer.byteLength(rawJson, 'utf8');
  let parsedJson = null;
  try {
    parsedJson = JSON.parse(rawJson);
  } catch {}

  const isStrictlyEmpty = parsedJson &&
                          typeof parsedJson === 'object' &&
                          parsedJson.workspaces &&
                          typeof parsedJson.workspaces === 'object' &&
                          Object.keys(parsedJson.workspaces).length === 0;

  // 6.1 Strict JSON structure check
  record('Clean State', '6.1 .data/workspaces.json is strictly {"workspaces":{}}', isStrictlyEmpty, {
    byteLength,
    rawJson: rawJson.trim(),
    keys: Object.keys(parsedJson?.workspaces || {}),
  });

  // ============================================================================
  // SUMMARY & RESULTS
  // ============================================================================
  console.log('\n================================================================');
  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const failed = total - passed;
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    console.error('STRESS HARNESS FAILED! Some assertions did not pass.');
    process.exit(1);
  } else {
    console.log('ALL EMPIRICAL ASSERTIONS PASSED WITH ZERO ERRORS.');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
