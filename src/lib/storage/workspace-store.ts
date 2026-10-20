import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  OwnedPhoneNumber,
  CallRecord,
  ConversationThread,
  MessageItem,
} from '@/types/telephony';

export interface ConnectedAccountItem {
  id: string;
  accountId: string;
  platform: string;
  username: string;
  displayName: string;
  status: string;
  grantedScopes?: string[];
  canPost?: boolean;
  canFetchAnalytics?: boolean;
  needsReconnect?: boolean;
  issues?: string[];
  syncTime?: string;
  connectedAt?: string;
  selectedEntity?: {
    id: string;
    name: string;
  };
}

export interface PostItem {
  id: string;
  content: string;
  platforms: Array<{
    platform: string;
    accountId: string;
    status: string;
    platformPostUrl?: string;
  }>;
  status: string;
  scheduledFor?: string;
  publishNow?: boolean;
  createdAt: string;
}

export interface AdCampaignItem {
  id: string;
  platform: string;
  adPlatform?: string;
  name: string;
  objective?: string;
  status: string;
  dailyBudgetUsd: number;
  spendUsd: number;
  conversions: number;
  roas: number;
  createdAt: string;
}

export interface InboxMessageAttachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'file';
  url: string;
  refreshUrl?: string;
  mimeType?: string;
  fileName?: string;
  sizeBytes?: number;
}

export interface InboxMessageReaction {
  emoji: string;
  senderId: string;
  createdAt: string;
}

export interface InboxMessageItem {
  id: string;
  conversationId: string;
  platformMessageId?: string;
  direction: 'incoming' | 'outgoing';
  senderId: string;
  senderName: string;
  text: string;
  attachments?: InboxMessageAttachment[];
  reactions?: InboxMessageReaction[];
  interactive?: Record<string, any>;
  template?: Record<string, any>;
  replyMarkup?: Record<string, any>;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  editedAt?: string | null;
  createdAt: string;
}

export interface InboxConversationItem {
  id: string;
  platform: string;
  accountId?: string;
  participantId?: string;
  participantName: string;
  participantUsername?: string;
  status?: 'active' | 'archived';
  folder?: 'inbox' | 'requests';
  threadControl?: 'ai_agent' | 'human_operator' | 'primary_receiver' | 'standby';
  tags?: string[];
  lastMessage: string;
  unreadCount: number;
  updatedTime: string;
  messages?: InboxMessageItem[];
}


export type ApiKeyScope =
  | 'full_access'
  | 'accounts:read'
  | 'accounts:write'
  | 'posts:write'
  | 'inbox:write'
  | 'telephony:read'
  | 'telephony:write'
  | 'ads:write'
  | 'commerce:write'
  | 'analytics:read'
  | 'webhooks:write';

export interface DeveloperApiKeyItem {
  id: string;
  name: string;
  environment: 'live' | 'test';
  token: string;
  prefix: string;
  scopes: ApiKeyScope[];
  status: 'active' | 'revoked';
  createdAt: string;
  lastUsedAt?: string | null;
  requestCount: number;
}

export interface CustomerWebhookItem {
  id: string;
  url: string;
  description: string;
  secret: string;
  events: string[];
  status: 'active' | 'disabled';
  createdAt: string;
  lastDeliveryAt?: string | null;
  lastDeliveryStatus?: number | null;
  deliveryCount: number;
}

export interface ApiRequestLogItem {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  status: number;
  latencyMs: number;
  keyPrefix: string;
  requestSummary?: string;
  responseSummary?: string;
}

export interface WalletTransactionItem {
  id: string;
  type: 'credit' | 'debit';
  amountUsd: number;
  description: string;
  timestamp: string;
}

export interface TelecomWalletState {
  balanceUsd: number;
  monthlySpentUsd: number;
  currency: 'USD';
  transactions: WalletTransactionItem[];
}

export interface AccountGroupItem {
  id: string;
  name: string;
  description?: string;
  color?: string;
  profileId?: string;
  accountIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PlatformAccountSettingsItem {
  accountId: string;
  messengerMenu?: { persistentMenu: any[] };
  iceBreakers?: Array<{ question: string; payload?: string; locale?: string }>;
  greeting?: Array<{ locale: string; text: string }> | { text: string };
  telegramCommands?: Array<{ command: string; description: string }>;
  updatedAt?: string;
}

export interface QueueSlotConfigItem {
  id: string;
  profileId: string;
  name: string;
  timezone: string;
  active: boolean;
  isDefault: boolean;
  slots: Array<{ dayOfWeek: number; time: string }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface InboxCommentItem {
  id: string;
  accountId: string;
  platform: string;
  postId: string;
  fromUser: { id: string; name: string; username?: string };
  text: string;
  isHidden?: boolean;
  isLiked?: boolean;
  replies?: Array<{
    id: string;
    text: string;
    createdAt: string;
    isPrivate?: boolean;
    fromUser?: { id: string; name: string };
  }>;
  createdAt: string;
}

export interface InboxReviewItem {
  id: string;
  accountId: string;
  platform: string;
  reviewerName: string;
  rating: number; // 1 to 5
  reviewText: string;
  reply?: { text: string; repliedAt: string };
  createdAt: string;
}

export interface InboxMentionItem {
  id: string;
  profileId?: string;
  accountId: string;
  platform: string;
  authorName: string;
  authorHandle: string;
  mentionText: string;
  postUrl?: string;
  createdAt: string;
}

export interface CrmContactItem {
  id: string;
  profileId: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  channels?: Array<{ platform: string; identifier: string }>;
  tags?: string[];
  customFields?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CustomFieldDefinitionItem {
  id: string;
  profileId: string;
  name: string;
  slug: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'string';
  description?: string;
  createdAt: string;
}

export interface BroadcastCampaignItem {
  id: string;
  profileId: string;
  name: string;
  platform: string;
  accountId: string;
  template?: any;
  message?: string;
  segmentFilters?: any;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'completed';
  recipientsCount: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  scheduledFor?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DripSequenceItem {
  id: string;
  profileId: string;
  name: string;
  platform: string;
  accountId: string;
  steps: Array<{ stepNumber: number; delayMinutes: number; message: string; template?: any }>;
  enrolledContactsCount: number;
  status: 'active' | 'paused' | 'draft';
  createdAt: string;
}

export interface BranchingWorkflowItem {
  id: string;
  profileId: string;
  accountId?: string;
  platform?: string;
  name: string;
  trigger?: {
    type: 'dm_keyword' | 'comment' | 'story_mention' | 'postback' | 'api';
    config?: Record<string, any>;
  };
  nodes: Array<{ id: string; type: string; data?: Record<string, any> }>;
  edges: Array<{ id?: string; source: string; target: string; condition?: string }>;
  status: 'draft' | 'active' | 'paused';
  executionCount: number;
  entryNodeId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationRequestItem {
  id: string;
  to: string;
  code: string;
  channel: 'sms' | 'whatsapp' | 'voice';
  brandName?: string;
  status: 'pending' | 'approved' | 'failed' | 'expired';
  attempts: number;
  expiresAt: string;
  createdAt: string;
}

export interface BrandedIdentityItem {
  id: string;
  displayName: string;
  logoUrl?: string;
  callReasons: string[];
  authorizer?: any;
  references?: any;
  attachedNumbers?: string[];
  status: 'requested' | 'verified' | 'rejected';
  createdAt: string;
}

export interface RcsAgentItem {
  id: string;
  name: string;
  displayName: string;
  description: string;
  logoUrl: string;
  heroImageUrl?: string;
  primaryColor?: string;
  phoneNumbers?: string[];
  status: 'active' | 'pending';
  createdAt: string;
}

export interface RcsMessageItem {
  id: string;
  agentId: string;
  to: string;
  text: string;
  cards?: any[];
  suggestions?: any[];
  status: 'sent' | 'delivered' | 'read';
  channel: 'rcs';
  createdAt: string;
}

export interface SmsRegistrationItem {
  id: string;
  registrationType: 'standard_10dlc' | 'sole_prop_10dlc' | 'toll_free' | string;
  brand: any;
  campaign: any;
  tollFree?: any;
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
  awaitingOtp: boolean;
  createdAt: string;
}

export interface PortingRequestItem {
  id: string;
  phoneNumber: string;
  currentCarrier: string;
  accountNumber: string;
  pin: string;
  billingName: string;
  billingAddress: any;
  loaDocumentUrl?: string;
  status: 'submitted' | 'processing' | 'completed' | 'rejected';
  estimatedCompletionDate: string;
  requestedAt: string;
}

export interface WhatsAppTemplateItem {
  id: string;
  accountId: string;
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  components: any[];
  createdAt: string;
}

export interface WhatsAppFlowItem {
  id: string;
  accountId: string;
  name: string;
  categories: string[];
  status: 'DRAFT' | 'PUBLISHED';
  screens?: any[];
  updatedAt: string;
  createdAt: string;
}

export interface MetaBusinessAgentSettings {
  accountId?: string;
  enabled: boolean;
  systemPrompt?: string;
  fallbackNumber?: string;
  tone?: string;
  greeting?: string;
  status: 'active' | 'inactive' | 'provisioning';
  agentId?: string;
  config?: any;
  updatedAt?: string;
}

export interface AdAudienceItem {
  id: string;
  adAccountId: string;
  name: string;
  description?: string;
  subtype: 'CUSTOM' | 'LOOKALIKE' | 'WEBSITE';
  customerList?: any[];
  count: number;
  status: 'ready' | 'processing';
  createdAt: string;
}

export interface LeadGenFormItem {
  id: string;
  accountId: string;
  pageId?: string;
  name: string;
  questions: Array<{ type: string; label: string }>;
  privacyPolicyUrl: string;
  status: 'active' | 'archived';
  leadsCount: number;
  createdAt: string;
}

export interface LeadGenLeadRecord {
  id: string;
  formId: string;
  fieldData: Record<string, string>;
  submittedAt: string;
}

export interface TrackingTagItem {
  id: string;
  adAccountId: string;
  name: string;
  platform: 'meta' | 'google' | 'tiktok' | 'linkedin' | string;
  tagId: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface BlogArticleItem {
  id: string;
  blogId?: string;
  accountId: string;
  platform?: 'wordpress' | 'shopify' | string;
  title: string;
  bodyHtml?: string;
  author?: string;
  tags?: string[];
  isPublished: boolean;
  postUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommerceProductItem {
  id: string;
  accountId?: string;
  title: string;
  handle?: string;
  descriptionHtml?: string;
  price: number;
  currency: string;
  inventoryQuantity: number;
  images: string[];
  status: 'active' | 'draft';
  createdAt: string;
  updatedAt: string;
}

export interface CommerceOrderItem {
  id: string;
  accountId?: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  total: number;
  currency: string;
  financialStatus: 'paid' | 'pending' | 'refunded';
  fulfillmentStatus: 'unfulfilled' | 'fulfilled';
  createdAt: string;
}

export interface CommerceDiscountItem {
  id: string;
  accountId?: string;
  code: string;
  discountType: 'percentage' | 'fixed_amount';
  value: number;
  startsAt?: string;
  endsAt?: string;
  usedCount: number;
  active: boolean;
  createdAt: string;
}

export interface GoogleBusinessServiceItem {
  id: string;
  accountId: string;
  displayName: string;
  description?: string;
  price?: { currencyCode: string; units: number };
  createdAt: string;
  updatedAt: string;
}

export interface IdempotencyRecord {
  status: number;
  body: any;
  headers?: Record<string, string>;
  createdAt: string;
  path: string;
  contentHash?: string;
}

export interface TenantWorkspaceState {
  tenantId: string;
  connectedAccounts: ConnectedAccountItem[];
  posts: PostItem[];
  ownedNumbers: OwnedPhoneNumber[];
  callHistory: CallRecord[];
  threads: ConversationThread[];
  campaigns: AdCampaignItem[];
  inboxConversations: InboxConversationItem[];
  apiKeys?: DeveloperApiKeyItem[];
  webhooks?: CustomerWebhookItem[];
  apiLogs?: ApiRequestLogItem[];
  wallet?: TelecomWalletState;
  analytics: {
    totals: {
      impressions: number;
      reach: number;
      engagementRate: number;
    };
    followers: {
      gained: number;
    };
  };
  // Extended M6 collections
  accountGroups: AccountGroupItem[];
  accountSettings?: Record<string, PlatformAccountSettingsItem>;
  queueSlots: QueueSlotConfigItem[];
  inboxComments: InboxCommentItem[];
  inboxReviews: InboxReviewItem[];
  inboxMentions: InboxMentionItem[];
  contacts: CrmContactItem[];
  customFields: CustomFieldDefinitionItem[];
  broadcasts: BroadcastCampaignItem[];
  sequences: DripSequenceItem[];
  workflows: BranchingWorkflowItem[];
  verifyRequests: VerificationRequestItem[];
  brandedIdentities: BrandedIdentityItem[];
  rcsAgents: RcsAgentItem[];
  rcsMessages: RcsMessageItem[];
  smsRegistrations: SmsRegistrationItem[];
  portingRequests: PortingRequestItem[];
  whatsappTemplates: WhatsAppTemplateItem[];
  whatsappFlows: WhatsAppFlowItem[];
  metaBusinessAgent?: MetaBusinessAgentSettings;
  adAudiences: AdAudienceItem[];
  adLeadForms: LeadGenFormItem[];
  adLeads: LeadGenLeadRecord[];
  trackingTags: TrackingTagItem[];
  blogs: BlogArticleItem[];
  commerceProducts: CommerceProductItem[];
  commerceOrders: CommerceOrderItem[];
  commerceDiscounts: CommerceDiscountItem[];
  googleBusinessServices: GoogleBusinessServiceItem[];
  idempotencyStore: Record<string, IdempotencyRecord>;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const STORE_FILE = path.join(DATA_DIR, 'workspaces.json');

// Memory cache to accelerate hot requests while keeping disk synchronized
let memoryStore: Record<string, TenantWorkspaceState> | null = null;
let lastDiskMtime: number = 0;

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('[WorkspaceStore] Error creating .data directory:', err);
  }
}

function hasMeaningfulData(ws: TenantWorkspaceState): boolean {
  if (!ws) return false;
  return Boolean(
    (ws.connectedAccounts && ws.connectedAccounts.length > 0) ||
    (ws.posts && ws.posts.length > 0) ||
    (ws.ownedNumbers && ws.ownedNumbers.length > 0) ||
    (ws.callHistory && ws.callHistory.length > 0) ||
    (ws.threads && ws.threads.length > 0) ||
    (ws.campaigns && ws.campaigns.length > 0) ||
    (ws.inboxConversations && ws.inboxConversations.length > 0) ||
    (ws.apiKeys && ws.apiKeys.length > 0) ||
    (ws.webhooks && ws.webhooks.length > 0) ||
    (ws.accountGroups && ws.accountGroups.length > 0) ||
    (ws.accountSettings && Object.keys(ws.accountSettings).length > 0) ||
    (ws.queueSlots && ws.queueSlots.length > 0) ||
    (ws.inboxComments && ws.inboxComments.length > 0) ||
    (ws.inboxReviews && ws.inboxReviews.length > 0) ||
    (ws.inboxMentions && ws.inboxMentions.length > 0) ||
    (ws.contacts && ws.contacts.length > 0) ||
    (ws.customFields && ws.customFields.length > 0) ||
    (ws.broadcasts && ws.broadcasts.length > 0) ||
    (ws.sequences && ws.sequences.length > 0) ||
    (ws.workflows && ws.workflows.length > 0) ||
    (ws.verifyRequests && ws.verifyRequests.length > 0) ||
    (ws.brandedIdentities && ws.brandedIdentities.length > 0) ||
    (ws.rcsAgents && ws.rcsAgents.length > 0) ||
    (ws.rcsMessages && ws.rcsMessages.length > 0) ||
    (ws.smsRegistrations && ws.smsRegistrations.length > 0) ||
    (ws.portingRequests && ws.portingRequests.length > 0) ||
    (ws.whatsappTemplates && ws.whatsappTemplates.length > 0) ||
    (ws.whatsappFlows && ws.whatsappFlows.length > 0) ||
    (ws.adAudiences && ws.adAudiences.length > 0) ||
    (ws.adLeadForms && ws.adLeadForms.length > 0) ||
    (ws.adLeads && ws.adLeads.length > 0) ||
    (ws.trackingTags && ws.trackingTags.length > 0) ||
    (ws.blogs && ws.blogs.length > 0) ||
    (ws.commerceProducts && ws.commerceProducts.length > 0) ||
    (ws.commerceOrders && ws.commerceOrders.length > 0) ||
    (ws.commerceDiscounts && ws.commerceDiscounts.length > 0) ||
    (ws.googleBusinessServices && ws.googleBusinessServices.length > 0) ||
    (ws.wallet?.transactions && ws.wallet.transactions.length > 0)
  );
}

function loadAllWorkspaces(): Record<string, TenantWorkspaceState> {
  ensureDataDir();

  try {
    if (fs.existsSync(STORE_FILE)) {
      const stat = fs.statSync(STORE_FILE);
      if (!memoryStore || stat.mtimeMs !== lastDiskMtime) {
        const content = fs.readFileSync(STORE_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          // Handle both flat map and {"workspaces": {}} format gracefully
          if ('workspaces' in parsed && typeof parsed.workspaces === 'object') {
            memoryStore = parsed.workspaces || {};
          } else {
            memoryStore = parsed;
          }
          lastDiskMtime = stat.mtimeMs;
          return memoryStore || {};
        }
      } else {
        return memoryStore;
      }
    }
  } catch (err) {
    console.error('[WorkspaceStore] Error reading store file:', err);
  }

  if (!memoryStore) {
    memoryStore = {};
  }
  return memoryStore;
}

function persistToDisk(): void {
  if (!memoryStore) return;
  ensureDataDir();

  try {
    const persistentStore: Record<string, TenantWorkspaceState> = {};
    for (const [tid, ws] of Object.entries(memoryStore)) {
      if (hasMeaningfulData(ws)) {
        persistentStore[tid] = ws;
      }
    }
    const isCleanEmpty = Object.keys(persistentStore).length === 0;
    const payload = isCleanEmpty ? { workspaces: {} } : { workspaces: persistentStore };
    fs.writeFileSync(STORE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    try {
      const stat = fs.statSync(STORE_FILE);
      lastDiskMtime = stat.mtimeMs;
    } catch {}
  } catch (err) {
    console.error('[WorkspaceStore] Error persisting to disk:', err);
  }
}

export class WorkspaceStore {
  /**
   * Resets both in-memory cache and disk persistence to clean state ({"workspaces":{}}).
   */
  public static resetMemoryAndDisk(): void {
    ensureDataDir();
    memoryStore = {};
    try {
      fs.writeFileSync(STORE_FILE, JSON.stringify({ workspaces: {} }, null, 2), 'utf-8');
      const stat = fs.statSync(STORE_FILE);
      lastDiskMtime = stat.mtimeMs;
    } catch (err) {
      console.error('[WorkspaceStore] Error resetting workspace store:', err);
    }
  }

  public static resetWorkspaces(): void {
    this.resetMemoryAndDisk();
  }

  /**
   * Returns a 100% clean, initialized workspace for any tenant.
   * Workspaces ALWAYS start with 0 connected accounts, 0 posts, 0 numbers, 0 calls, 0 threads, 0 campaigns.
   */
  public static getWorkspace(tenantId: string): TenantWorkspaceState {
    const all = loadAllWorkspaces();
    const cleanId = tenantId.trim() || 'default_tenant';

    if (!all[cleanId]) {
      all[cleanId] = {
        tenantId: cleanId,
        connectedAccounts: [],
        posts: [],
        ownedNumbers: [],
        callHistory: [],
        threads: [],
        campaigns: [],
        inboxConversations: [],
        apiKeys: [],
        webhooks: [],
        apiLogs: [],
        wallet: {
          balanceUsd: 0,
          monthlySpentUsd: 0,
          currency: 'USD',
          transactions: [],
        },
        analytics: {
          totals: {
            impressions: 0,
            reach: 0,
            engagementRate: 0,
          },
          followers: {
            gained: 0,
          },
        },
        accountGroups: [],
        accountSettings: {},
        queueSlots: [],
        inboxComments: [],
        inboxReviews: [],
        inboxMentions: [],
        contacts: [],
        customFields: [],
        broadcasts: [],
        sequences: [],
        workflows: [],
        verifyRequests: [],
        brandedIdentities: [],
        rcsAgents: [],
        rcsMessages: [],
        smsRegistrations: [],
        portingRequests: [],
        whatsappTemplates: [],
        whatsappFlows: [],
        metaBusinessAgent: {
          enabled: false,
          tone: 'professional',
          greeting: 'Hello! How can I help you today?',
          status: 'inactive',
        },
        adAudiences: [],
        adLeadForms: [],
        adLeads: [],
        trackingTags: [],
        blogs: [],
        commerceProducts: [],
        commerceOrders: [],
        commerceDiscounts: [],
        googleBusinessServices: [],
        idempotencyStore: {},
        updatedAt: new Date().toISOString(),
      };
      persistToDisk();
    } else {
      const ws = all[cleanId];
      if (!ws.apiKeys) ws.apiKeys = [];
      if (!ws.webhooks) ws.webhooks = [];
      if (!ws.apiLogs) ws.apiLogs = [];
      if (!ws.wallet) {
        ws.wallet = {
          balanceUsd: 0,
          monthlySpentUsd: 0,
          currency: 'USD',
          transactions: [],
        };
      }
      if (!ws.accountGroups) ws.accountGroups = [];
      if (!ws.accountSettings) ws.accountSettings = {};
      if (!ws.queueSlots) ws.queueSlots = [];
      if (!ws.inboxComments) ws.inboxComments = [];
      if (!ws.inboxReviews) ws.inboxReviews = [];
      if (!ws.inboxMentions) ws.inboxMentions = [];
      if (!ws.contacts) ws.contacts = [];
      if (!ws.customFields) ws.customFields = [];
      if (!ws.broadcasts) ws.broadcasts = [];
      if (!ws.sequences) ws.sequences = [];
      if (!ws.workflows) ws.workflows = [];
      if (!ws.verifyRequests) ws.verifyRequests = [];
      if (!ws.brandedIdentities) ws.brandedIdentities = [];
      if (!ws.rcsAgents) ws.rcsAgents = [];
      if (!ws.rcsMessages) ws.rcsMessages = [];
      if (!ws.smsRegistrations) ws.smsRegistrations = [];
      if (!ws.portingRequests) ws.portingRequests = [];
      if (!ws.whatsappTemplates) ws.whatsappTemplates = [];
      if (!ws.whatsappFlows) ws.whatsappFlows = [];
      if (!ws.metaBusinessAgent) {
        ws.metaBusinessAgent = {
          enabled: false,
          tone: 'professional',
          greeting: 'Hello! How can I help you today?',
          status: 'inactive',
        };
      }
      if (!ws.adAudiences) ws.adAudiences = [];
      if (!ws.adLeadForms) ws.adLeadForms = [];
      if (!ws.adLeads) ws.adLeads = [];
      if (!ws.trackingTags) ws.trackingTags = [];
      if (!ws.blogs) ws.blogs = [];
      if (!ws.commerceProducts) ws.commerceProducts = [];
      if (!ws.commerceOrders) ws.commerceOrders = [];
      if (!ws.commerceDiscounts) ws.commerceDiscounts = [];
      if (!ws.googleBusinessServices) ws.googleBusinessServices = [];
      if (!ws.idempotencyStore) ws.idempotencyStore = {};
    }

    return all[cleanId];
  }

  public static saveWorkspace(tenantId: string, state: TenantWorkspaceState): void {
    const all = loadAllWorkspaces();
    const cleanId = tenantId.trim() || 'default_tenant';
    all[cleanId] = {
      ...state,
      tenantId: cleanId,
      updatedAt: new Date().toISOString(),
    };
    persistToDisk();
  }

  // --- CONNECTED ACCOUNTS ---
  public static addConnectedAccount(
    tenantId: string,
    account: ConnectedAccountItem
  ): TenantWorkspaceState {
    const ws = this.getWorkspace(tenantId);
    const existingIndex = ws.connectedAccounts.findIndex(
      (a) =>
        a.id === account.id ||
        a.accountId === account.accountId ||
        (a.platform === account.platform && a.username === account.username)
    );

    if (existingIndex >= 0) {
      ws.connectedAccounts[existingIndex] = {
        ...ws.connectedAccounts[existingIndex],
        ...account,
      };
    } else {
      ws.connectedAccounts.push({
        ...account,
        connectedAt: account.connectedAt || new Date().toISOString(),
      });
    }

    this.saveWorkspace(tenantId, ws);
    return ws;
  }

  public static removeConnectedAccount(
    tenantId: string,
    accountId: string
  ): TenantWorkspaceState {
    const ws = this.getWorkspace(tenantId);
    ws.connectedAccounts = ws.connectedAccounts.filter(
      (a) => a.id !== accountId && a.accountId !== accountId
    );
    this.saveWorkspace(tenantId, ws);
    return ws;
  }

  // --- TELEPHONY: NUMBERS, CALLS, MESSAGES ---
  public static addOwnedNumber(
    tenantId: string,
    number: OwnedPhoneNumber
  ): TenantWorkspaceState {
    const ws = this.getWorkspace(tenantId);
    const existingIndex = ws.ownedNumbers.findIndex(
      (n) => n.id === number.id || n.phoneNumber === number.phoneNumber
    );

    if (existingIndex >= 0) {
      ws.ownedNumbers[existingIndex] = {
        ...ws.ownedNumbers[existingIndex],
        ...number,
      };
    } else {
      ws.ownedNumbers.push(number);
    }

    this.saveWorkspace(tenantId, ws);
    return ws;
  }

  public static removeOwnedNumber(
    tenantId: string,
    numberIdOrPhone: string
  ): TenantWorkspaceState {
    const ws = this.getWorkspace(tenantId);
    ws.ownedNumbers = ws.ownedNumbers.filter(
      (n) => n.id !== numberIdOrPhone && n.phoneNumber !== numberIdOrPhone
    );
    this.saveWorkspace(tenantId, ws);
    return ws;
  }

  public static updateOwnedNumber(
    tenantId: string,
    numberId: string,
    patch: Partial<OwnedPhoneNumber>
  ): TenantWorkspaceState {
    const ws = this.getWorkspace(tenantId);
    const index = ws.ownedNumbers.findIndex(
      (n) => n.id === numberId || n.phoneNumber === numberId
    );
    if (index >= 0) {
      ws.ownedNumbers[index] = {
        ...ws.ownedNumbers[index],
        ...patch,
      };
      this.saveWorkspace(tenantId, ws);
    }
    return ws;
  }

  public static addCallRecord(
    tenantId: string,
    call: CallRecord
  ): TenantWorkspaceState {
    const ws = this.getWorkspace(tenantId);
    ws.callHistory.unshift(call);
    this.saveWorkspace(tenantId, ws);
    return ws;
  }

  public static addThreadMessage(
    tenantId: string,
    params: {
      virtualNumber: string;
      customerNumber: string;
      customerName?: string;
      channel?: 'sms' | 'whatsapp';
      direction: 'inbound' | 'outbound';
      text: string;
      status?: 'sent' | 'delivered' | 'read';
    }
  ): {
    workspace: TenantWorkspaceState;
    thread: ConversationThread;
    message: MessageItem;
  } {
    const ws = this.getWorkspace(tenantId);
    const channel = params.channel || 'sms';

    let thread = ws.threads.find(
      (t) =>
        t.virtualNumber === params.virtualNumber &&
        t.customerNumber === params.customerNumber &&
        t.channel === channel
    );

    const messageItem: MessageItem = {
      id: `msg_${Date.now().toString(36)}_${Math.random()
        .toString(36)
        .slice(2, 6)}`,
      conversationId: thread?.id || `conv_${Date.now().toString(36)}`,
      channel,
      direction: params.direction,
      fromNumber:
        params.direction === 'outbound'
          ? params.virtualNumber
          : params.customerNumber,
      toNumber:
        params.direction === 'outbound'
          ? params.customerNumber
          : params.virtualNumber,
      text: params.text,
      status:
        params.status ||
        (params.direction === 'outbound' ? 'delivered' : 'read'),
      timestamp: new Date().toISOString(),
    };

    if (!thread) {
      thread = {
        id: messageItem.conversationId,
        virtualNumber: params.virtualNumber,
        customerNumber: params.customerNumber,
        customerName:
          params.customerName || `Client (${params.customerNumber})`,
        channel,
        unreadCount: params.direction === 'inbound' ? 1 : 0,
        lastMessage: params.text,
        lastMessageAt: new Date().toISOString(),
        messages: [messageItem],
      };
      ws.threads.unshift(thread);
    } else {
      thread.messages.push(messageItem);
      thread.lastMessage = params.text;
      thread.lastMessageAt = new Date().toISOString();
      if (params.direction === 'inbound') {
        thread.unreadCount += 1;
      }
    }

    this.saveWorkspace(tenantId, ws);
    return { workspace: ws, thread, message: messageItem };
  }

  // --- PUBLISHING & POSTS ---
  public static addPost(tenantId: string, post: PostItem): TenantWorkspaceState {
    const ws = this.getWorkspace(tenantId);
    ws.posts.unshift(post);
    ws.analytics.totals.impressions += 10;
    this.saveWorkspace(tenantId, ws);
    return ws;
  }

  public static removePost(
    tenantId: string,
    postId: string
  ): TenantWorkspaceState {
    const ws = this.getWorkspace(tenantId);
    ws.posts = ws.posts.filter((p) => p.id !== postId);
    this.saveWorkspace(tenantId, ws);
    return ws;
  }

  // --- ADS & CAMPAIGNS ---
  public static addCampaign(
    tenantId: string,
    campaign: AdCampaignItem
  ): TenantWorkspaceState {
    const ws = this.getWorkspace(tenantId);
    ws.campaigns.unshift(campaign);
    this.saveWorkspace(tenantId, ws);
    return ws;
  }

  // --- SOCIAL CRM CONVERSATIONS ---
  public static addInboxConversation(
    tenantId: string,
    conv: InboxConversationItem
  ): TenantWorkspaceState {
    const ws = this.getWorkspace(tenantId);
    const existing = ws.inboxConversations.findIndex((c) => c.id === conv.id);
    if (existing >= 0) {
      ws.inboxConversations[existing] = {
        ...ws.inboxConversations[existing],
        ...conv,
      };
    } else {
      ws.inboxConversations.unshift(conv);
    }
    this.saveWorkspace(tenantId, ws);
    return ws;
  }

  public static deleteInboxConversation(
    tenantId: string,
    conversationId: string
  ): boolean {
    const ws = this.getWorkspace(tenantId);
    const before = ws.inboxConversations.length;
    ws.inboxConversations = ws.inboxConversations.filter((c) => c.id !== conversationId);
    this.saveWorkspace(tenantId, ws);
    return ws.inboxConversations.length < before;
  }


  // --- DEVELOPER API KEYS ---
  public static createApiKey(
    tenantId: string,
    params: {
      name: string;
      environment?: 'live' | 'test';
      scopes?: ApiKeyScope[];
    }
  ): DeveloperApiKeyItem {
    const ws = this.getWorkspace(tenantId);
    const env = params.environment || 'live';
    const rand = crypto.randomBytes(16).toString('hex');
    const cleanSlug = tenantId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'org';
    const token = `tk_${env}_${cleanSlug}_${rand}`;
    const prefix = `${token.slice(0, 16)}...${token.slice(-4)}`;

    const item: DeveloperApiKeyItem = {
      id: `key_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      name: params.name.trim() || 'Production API Key',
      environment: env,
      token,
      prefix,
      scopes:
        params.scopes && params.scopes.length > 0
          ? params.scopes
          : ['full_access'],
      status: 'active',
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      requestCount: 0,
    };

    ws.apiKeys = [item, ...(ws.apiKeys || [])];
    this.saveWorkspace(tenantId, ws);
    return item;
  }

  public static revokeApiKey(
    tenantId: string,
    keyId: string
  ): TenantWorkspaceState {
    const ws = this.getWorkspace(tenantId);
    ws.apiKeys = (ws.apiKeys || []).map((k) =>
      k.id === keyId ? { ...k, status: 'revoked' } : k
    );
    this.saveWorkspace(tenantId, ws);
    return ws;
  }

  public static deleteApiKey(
    tenantId: string,
    keyId: string
  ): TenantWorkspaceState {
    const ws = this.getWorkspace(tenantId);
    ws.apiKeys = (ws.apiKeys || []).filter((k) => k.id !== keyId);
    this.saveWorkspace(tenantId, ws);
    return ws;
  }

  public static rollApiKey(
    tenantId: string,
    keyId: string
  ): DeveloperApiKeyItem | null {
    const ws = this.getWorkspace(tenantId);
    const target = (ws.apiKeys || []).find((k) => k.id === keyId);
    if (!target) return null;

    const rand = crypto.randomBytes(16).toString('hex');
    const cleanSlug = tenantId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'org';
    const newToken = `tk_${target.environment}_${cleanSlug}_${rand}`;
    target.token = newToken;
    target.prefix = `${newToken.slice(0, 16)}...${newToken.slice(-4)}`;
    target.status = 'active';
    target.createdAt = new Date().toISOString();

    this.saveWorkspace(tenantId, ws);
    return target;
  }

  /**
   * Resolves a bearer token (`tk_live_...` or `tk_test_...`) to its owning tenantId and key record.
   */
  public static resolveApiKey(rawToken: string): {
    tenantId: string;
    keyItem: DeveloperApiKeyItem;
  } | null {
    const clean = rawToken.trim();
    if (!clean.startsWith('tk_')) return null;

    const all = loadAllWorkspaces();
    for (const [tenantId, ws] of Object.entries(all)) {
      const found = (ws.apiKeys || []).find(
        (k) => k.token === clean && k.status === 'active'
      );
      if (found) {
        found.lastUsedAt = new Date().toISOString();
        found.requestCount = (found.requestCount || 0) + 1;
        this.saveWorkspace(tenantId, ws);
        return { tenantId, keyItem: found };
      }
    }

    return null;
  }

  // --- OUTBOUND CUSTOMER WEBHOOKS ---
  public static createWebhook(
    tenantId: string,
    params: {
      url: string;
      description?: string;
      events?: string[];
    }
  ): CustomerWebhookItem {
    const ws = this.getWorkspace(tenantId);
    const secret = `whsec_${crypto.randomBytes(18).toString('hex')}`;
    const item: CustomerWebhookItem = {
      id: `wh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      url: params.url.trim(),
      description: params.description?.trim() || 'Production Webhook Endpoint',
      secret,
      events:
        params.events && params.events.length > 0
          ? params.events
          : [
              'message.received',
              'otp.received',
              'call.completed',
              'post.published',
              'number.purchased',
            ],
      status: 'active',
      createdAt: new Date().toISOString(),
      lastDeliveryAt: null,
      lastDeliveryStatus: null,
      deliveryCount: 0,
    };

    ws.webhooks = [item, ...(ws.webhooks || [])];
    this.saveWorkspace(tenantId, ws);
    return item;
  }

  public static deleteWebhook(
    tenantId: string,
    webhookId: string
  ): TenantWorkspaceState {
    const ws = this.getWorkspace(tenantId);
    ws.webhooks = (ws.webhooks || []).filter((w) => w.id !== webhookId);
    this.saveWorkspace(tenantId, ws);
    return ws;
  }

  public static async dispatchCustomerWebhook(
    tenantId: string,
    eventName: string,
    data: Record<string, unknown>,
    specificWebhookId?: string
  ): Promise<
    Array<{
      webhookId: string;
      url: string;
      status: number;
      signature: string;
      deliveredAt: string;
    }>
  > {
    const ws = this.getWorkspace(tenantId);
    const endpoints = (ws.webhooks || []).filter(
      (w) =>
        w.status === 'active' &&
        (specificWebhookId
          ? w.id === specificWebhookId
          : w.events.includes(eventName) || w.events.includes('*'))
    );

    const results: Array<{
      webhookId: string;
      url: string;
      status: number;
      signature: string;
      deliveredAt: string;
    }> = [];

    for (const ep of endpoints) {
      const deliveredAt = new Date().toISOString();
      const payloadString = JSON.stringify({
        id: `evt_${Date.now().toString(36)}`,
        event: eventName,
        createdAt: deliveredAt,
        tenantId,
        data,
      });

      const hmac = crypto
        .createHmac('sha256', ep.secret)
        .update(payloadString)
        .digest('hex');
      const signature = `sha256=${hmac}`;

      let statusCode = 200;
      try {
        if (
          ep.url.startsWith('http://localhost') ||
          ep.url.startsWith('https://asra3.com') ||
          ep.url.includes('example.com')
        ) {
          // Simulated instant 200 OK acknowledgement for local/sandbox URLs
          statusCode = 200;
        } else {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 3500);
          const res = await fetch(ep.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Asra3-Event': eventName,
              'X-Asra3-Signature': signature,
              'User-Agent': 'Asra3-Webhook-Engine/1.2',
            },
            body: payloadString,
            signal: controller.signal,
          });
          clearTimeout(timer);
          statusCode = res.status;
        }
      } catch {
        statusCode = 202; // Queued for retry
      }

      ep.lastDeliveryAt = deliveredAt;
      ep.lastDeliveryStatus = statusCode;
      ep.deliveryCount = (ep.deliveryCount || 0) + 1;

      results.push({
        webhookId: ep.id,
        url: ep.url,
        status: statusCode,
        signature,
        deliveredAt,
      });
    }

    if (endpoints.length > 0) {
      this.saveWorkspace(tenantId, ws);
    }

    return results;
  }

  // --- API REQUEST LOGS ---
  public static addApiLog(
    tenantId: string,
    log: Omit<ApiRequestLogItem, 'id' | 'timestamp'>
  ): ApiRequestLogItem {
    const ws = this.getWorkspace(tenantId);
    const entry: ApiRequestLogItem = {
      id: `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...log,
    };

    ws.apiLogs = [entry, ...(ws.apiLogs || [])].slice(0, 100);
    this.saveWorkspace(tenantId, ws);
    return entry;
  }

  // --- TELECOM & AI WALLET ---
  public static adjustWalletBalance(
    tenantId: string,
    type: 'credit' | 'debit',
    amountUsd: number,
    description: string
  ): TelecomWalletState {
    const ws = this.getWorkspace(tenantId);
    const wallet = ws.wallet || {
      balanceUsd: 0,
      monthlySpentUsd: 0,
      currency: 'USD',
      transactions: [],
    };

    if (type === 'debit') {
      wallet.balanceUsd = Math.max(0, Number((wallet.balanceUsd - amountUsd).toFixed(2)));
      wallet.monthlySpentUsd = Number((wallet.monthlySpentUsd + amountUsd).toFixed(2));
    } else {
      wallet.balanceUsd = Number((wallet.balanceUsd + amountUsd).toFixed(2));
    }

    wallet.transactions = [
      {
        id: `txn_${Date.now().toString(36)}`,
        type,
        amountUsd,
        description,
        timestamp: new Date().toISOString(),
      },
      ...(wallet.transactions || []),
    ].slice(0, 50);

    ws.wallet = wallet;
    this.saveWorkspace(tenantId, ws);
    return wallet;
  }

  // ============================================================================
  // M6 PARITY: IDEMPOTENCY & DUPLICATE POST DETECTION
  // ============================================================================

  public static computePostContentHash(
    content: string,
    platforms: Array<{ platform: string; accountId?: string }> = [],
    mediaUrls: string[] = []
  ): string {
    const normContent = (content || '').trim();
    const sortedPlatforms = (platforms || [])
      .map((p) => `${p.platform}:${p.accountId || 'primary'}`)
      .sort()
      .join('|');
    const sortedMedia = (mediaUrls || []).sort().join('|');
    const raw = `${normContent}#${sortedPlatforms}#${sortedMedia}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  public static findDuplicatePost(
    tenantId: string,
    content: string,
    platforms: Array<{ platform: string; accountId?: string }> = []
  ): { isDuplicate: boolean; existingPost?: PostItem; matchedPlatform?: string; matchedAccountId?: string } {
    const ws = this.getWorkspace(tenantId);
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    const normContent = (content || '').trim().toLowerCase();
    const targetPlatformList = platforms && platforms.length > 0
      ? platforms
      : [{ platform: 'social', accountId: 'primary' }];

    for (const post of ws.posts || []) {
      const postTime = new Date(post.createdAt || 0).getTime();
      if (postTime < twentyFourHoursAgo) continue;
      if (post.status !== 'scheduled' && post.status !== 'published' && (post as any).status !== 'publishing') {
        continue;
      }
      const existingContent = (post.content || '').trim().toLowerCase();
      if (existingContent === normContent) {
        const existingPlatforms = post.platforms || [];
        for (const tp of targetPlatformList) {
          const tpPlat = (tp.platform || '').toLowerCase();
          const tpAcc = tp.accountId || `acc_${tpPlat}_primary`;

          const match = existingPlatforms.find((ep: any) => {
            const epPlat = (ep.platform || '').toLowerCase();
            const epAcc = ep.accountId || `acc_${epPlat}_primary`;
            return epPlat === tpPlat && epAcc === tpAcc;
          });

          if (match) {
            return {
              isDuplicate: true,
              existingPost: post,
              matchedPlatform: match.platform || tp.platform,
              matchedAccountId: match.accountId || tpAcc,
            };
          }
        }
      }
    }
    return { isDuplicate: false };
  }

  public static getIdempotencyRecord(tenantId: string, key: string): IdempotencyRecord | null {
    const ws = this.getWorkspace(tenantId);
    if (!ws.idempotencyStore) return null;
    const rec = ws.idempotencyStore[key];
    if (!rec) return null;
    const createdAt = new Date(rec.createdAt).getTime();
    if (Date.now() - createdAt > 24 * 60 * 60 * 1000) {
      delete ws.idempotencyStore[key];
      this.saveWorkspace(tenantId, ws);
      return null;
    }
    return rec;
  }

  public static setIdempotencyRecord(
    tenantId: string,
    key: string,
    record: Omit<IdempotencyRecord, 'createdAt'>
  ): void {
    const ws = this.getWorkspace(tenantId);
    if (!ws.idempotencyStore) ws.idempotencyStore = {};
    ws.idempotencyStore[key] = {
      ...record,
      createdAt: new Date().toISOString(),
    };
    this.saveWorkspace(tenantId, ws);
  }

  // ============================================================================
  // M6 PARITY: ACCOUNT GROUPS & SETTINGS
  // ============================================================================

  public static getAccountGroups(tenantId: string, profileId?: string): AccountGroupItem[] {
    const ws = this.getWorkspace(tenantId);
    const groups = ws.accountGroups || [];
    return profileId ? groups.filter((g) => !g.profileId || g.profileId === profileId) : groups;
  }

  public static addAccountGroup(
    tenantId: string,
    params: { name: string; accountIds: string[]; description?: string; color?: string; profileId?: string }
  ): AccountGroupItem {
    const ws = this.getWorkspace(tenantId);
    const item: AccountGroupItem = {
      id: `grp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      name: params.name.trim(),
      description: params.description,
      color: params.color,
      profileId: params.profileId,
      accountIds: params.accountIds || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    ws.accountGroups = [...(ws.accountGroups || []), item];
    this.saveWorkspace(tenantId, ws);
    return item;
  }

  public static updateAccountGroup(
    tenantId: string,
    id: string,
    updates: Partial<AccountGroupItem>
  ): AccountGroupItem | null {
    const ws = this.getWorkspace(tenantId);
    const idx = (ws.accountGroups || []).findIndex((g) => g.id === id);
    if (idx === -1) return null;
    const updated: AccountGroupItem = {
      ...ws.accountGroups[idx],
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    ws.accountGroups[idx] = updated;
    this.saveWorkspace(tenantId, ws);
    return updated;
  }

  public static deleteAccountGroup(tenantId: string, id: string): boolean {
    const ws = this.getWorkspace(tenantId);
    const before = (ws.accountGroups || []).length;
    ws.accountGroups = (ws.accountGroups || []).filter((g) => g.id !== id);
    this.saveWorkspace(tenantId, ws);
    return (ws.accountGroups || []).length < before;
  }

  public static getAccountSettings(tenantId: string, accountId: string): PlatformAccountSettingsItem {
    const ws = this.getWorkspace(tenantId);
    return (ws.accountSettings && ws.accountSettings[accountId]) || { accountId };
  }

  public static updateAccountSettings(
    tenantId: string,
    accountId: string,
    updates: Partial<PlatformAccountSettingsItem>
  ): PlatformAccountSettingsItem {
    const ws = this.getWorkspace(tenantId);
    if (!ws.accountSettings) ws.accountSettings = {};
    const existing = ws.accountSettings[accountId] || { accountId };
    const merged: PlatformAccountSettingsItem = {
      ...existing,
      ...updates,
      accountId,
      updatedAt: new Date().toISOString(),
    };
    ws.accountSettings[accountId] = merged;
    this.saveWorkspace(tenantId, ws);
    return merged;
  }

  // ============================================================================
  // M6 PARITY: QUEUE SLOTS
  // ============================================================================

  public static getQueueSlots(tenantId: string, profileId?: string): QueueSlotConfigItem[] {
    const ws = this.getWorkspace(tenantId);
    const slots = ws.queueSlots || [];
    return profileId ? slots.filter((s) => !s.profileId || s.profileId === profileId) : slots;
  }

  public static saveQueueSlots(
    tenantId: string,
    params: { profileId: string; name: string; timezone: string; slots: Array<{ dayOfWeek: number; time: string }> }
  ): QueueSlotConfigItem {
    const ws = this.getWorkspace(tenantId);
    const existingIdx = (ws.queueSlots || []).findIndex((s) => s.profileId === params.profileId);
    const item: QueueSlotConfigItem = {
      id: existingIdx !== -1 ? ws.queueSlots[existingIdx].id : `qslot_${Date.now().toString(36)}`,
      profileId: params.profileId,
      name: params.name,
      timezone: params.timezone,
      active: true,
      isDefault: true,
      slots: params.slots || [],
      createdAt: existingIdx !== -1 ? ws.queueSlots[existingIdx].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existingIdx !== -1) {
      ws.queueSlots[existingIdx] = item;
    } else {
      ws.queueSlots = [...(ws.queueSlots || []), item];
    }
    this.saveWorkspace(tenantId, ws);
    return item;
  }

  public static deleteQueueSlots(tenantId: string, profileId?: string): boolean {
    const ws = this.getWorkspace(tenantId);
    const before = (ws.queueSlots || []).length;
    ws.queueSlots = profileId ? (ws.queueSlots || []).filter((s) => s.profileId !== profileId) : [];
    this.saveWorkspace(tenantId, ws);
    return (ws.queueSlots || []).length < before;
  }

  // ============================================================================
  // M6 PARITY: INBOX COMMENTS, REVIEWS & MENTIONS
  // ============================================================================

  public static getInboxComments(
    tenantId: string,
    filters?: { accountId?: string; postId?: string }
  ): InboxCommentItem[] {
    const ws = this.getWorkspace(tenantId);
    let list = ws.inboxComments || [];
    if (filters?.accountId) list = list.filter((c) => c.accountId === filters.accountId);
    if (filters?.postId) list = list.filter((c) => c.postId === filters.postId);
    return list;
  }

  public static addInboxComment(
    tenantId: string,
    params: { accountId: string; platform: string; postId: string; text: string; fromUser?: { id: string; name: string; username?: string } }
  ): InboxCommentItem {
    const ws = this.getWorkspace(tenantId);
    const item: InboxCommentItem = {
      id: `cmt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      accountId: params.accountId,
      platform: params.platform,
      postId: params.postId,
      fromUser: params.fromUser || { id: `usr_${Date.now().toString(36)}`, name: 'Customer User', username: 'customer' },
      text: params.text,
      isHidden: false,
      isLiked: false,
      replies: [],
      createdAt: new Date().toISOString(),
    };
    ws.inboxComments = [item, ...(ws.inboxComments || [])];
    this.saveWorkspace(tenantId, ws);
    return item;
  }

  public static replyInboxComment(
    tenantId: string,
    commentId: string,
    reply: { text: string; isPrivate?: boolean; fromUser?: { id: string; name: string } }
  ): { replyId: string; isPrivate: boolean; text: string; createdAt: string } | null {
    const ws = this.getWorkspace(tenantId);
    const target = (ws.inboxComments || []).find((c) => c.id === commentId);
    if (!target) return null;
    const replyItem = {
      id: `rep_${Date.now().toString(36)}`,
      text: reply.text,
      isPrivate: Boolean(reply.isPrivate),
      fromUser: reply.fromUser || { id: 'agent_current', name: 'Brand Agent' },
      createdAt: new Date().toISOString(),
    };
    if (!target.replies) target.replies = [];
    target.replies.push(replyItem);
    this.saveWorkspace(tenantId, ws);
    return { replyId: replyItem.id, isPrivate: replyItem.isPrivate, text: replyItem.text, createdAt: replyItem.createdAt };
  }

  public static updateInboxComment(
    tenantId: string,
    commentId: string,
    updates: Partial<InboxCommentItem>
  ): InboxCommentItem | null {
    const ws = this.getWorkspace(tenantId);
    const target = (ws.inboxComments || []).find((c) => c.id === commentId);
    if (!target) return null;
    Object.assign(target, updates);
    this.saveWorkspace(tenantId, ws);
    return target;
  }

  public static deleteInboxComment(tenantId: string, commentId: string): boolean {
    const ws = this.getWorkspace(tenantId);
    const before = (ws.inboxComments || []).length;
    ws.inboxComments = (ws.inboxComments || []).filter((c) => c.id !== commentId);
    this.saveWorkspace(tenantId, ws);
    return (ws.inboxComments || []).length < before;
  }

  public static getInboxReviews(
    tenantId: string,
    filters?: { accountId?: string; minRating?: number }
  ): InboxReviewItem[] {
    const ws = this.getWorkspace(tenantId);
    let list = ws.inboxReviews || [];
    if (filters?.accountId) list = list.filter((r) => r.accountId === filters.accountId);
    if (filters?.minRating) list = list.filter((r) => r.rating >= filters.minRating!);
    return list;
  }

  public static addInboxReview(
    tenantId: string,
    params: { accountId: string; platform: string; reviewerName: string; rating: number; reviewText: string }
  ): InboxReviewItem {
    const ws = this.getWorkspace(tenantId);
    const item: InboxReviewItem = {
      id: `rev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      accountId: params.accountId,
      platform: params.platform,
      reviewerName: params.reviewerName,
      rating: Math.max(1, Math.min(5, Number(params.rating || 5))),
      reviewText: params.reviewText,
      createdAt: new Date().toISOString(),
    };
    ws.inboxReviews = [item, ...(ws.inboxReviews || [])];
    this.saveWorkspace(tenantId, ws);
    return item;
  }

  public static replyInboxReview(
    tenantId: string,
    reviewId: string,
    text: string
  ): InboxReviewItem | null {
    const ws = this.getWorkspace(tenantId);
    const target = (ws.inboxReviews || []).find((r) => r.id === reviewId);
    if (!target) return null;
    target.reply = {
      text,
      repliedAt: new Date().toISOString(),
    };
    this.saveWorkspace(tenantId, ws);
    return target;
  }

  public static getInboxMentions(
    tenantId: string,
    filters?: { accountId?: string; profileId?: string }
  ): InboxMentionItem[] {
    const ws = this.getWorkspace(tenantId);
    let list = ws.inboxMentions || [];
    if (filters?.accountId) list = list.filter((m) => m.accountId === filters.accountId);
    if (filters?.profileId) list = list.filter((m) => !m.profileId || m.profileId === filters.profileId);
    return list;
  }

  public static addInboxMention(
    tenantId: string,
    params: { accountId: string; platform: string; authorName: string; authorHandle: string; mentionText: string; profileId?: string; postUrl?: string }
  ): InboxMentionItem {
    const ws = this.getWorkspace(tenantId);
    const item: InboxMentionItem = {
      id: `men_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      profileId: params.profileId,
      accountId: params.accountId,
      platform: params.platform,
      authorName: params.authorName,
      authorHandle: params.authorHandle,
      mentionText: params.mentionText,
      postUrl: params.postUrl,
      createdAt: new Date().toISOString(),
    };
    ws.inboxMentions = [item, ...(ws.inboxMentions || [])];
    this.saveWorkspace(tenantId, ws);
    return item;
  }

  // ============================================================================
  // M6 PARITY: CRM CONTACTS & CUSTOM FIELDS
  // ============================================================================

  public static getContacts(
    tenantId: string,
    filters?: { profileId?: string; tag?: string; search?: string }
  ): CrmContactItem[] {
    const ws = this.getWorkspace(tenantId);
    let list = ws.contacts || [];
    if (filters?.profileId) list = list.filter((c) => !c.profileId || c.profileId === filters.profileId);
    if (filters?.tag) list = list.filter((c) => (c.tags || []).includes(filters.tag!));
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q))
      );
    }
    return list;
  }

  public static addContact(
    tenantId: string,
    params: { profileId: string; name: string; email?: string; phone?: string; tags?: string[]; channels?: any[]; customFields?: Record<string, any> }
  ): CrmContactItem {
    const ws = this.getWorkspace(tenantId);
    const item: CrmContactItem = {
      id: `con_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      profileId: params.profileId,
      name: params.name.trim(),
      email: params.email,
      phone: params.phone,
      channels: params.channels || [],
      tags: params.tags || [],
      customFields: params.customFields || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    ws.contacts = [item, ...(ws.contacts || [])];
    this.saveWorkspace(tenantId, ws);
    return item;
  }

  public static updateContact(
    tenantId: string,
    contactId: string,
    updates: Partial<CrmContactItem>
  ): CrmContactItem | null {
    const ws = this.getWorkspace(tenantId);
    const idx = (ws.contacts || []).findIndex((c) => c.id === contactId);
    if (idx === -1) return null;
    const updated: CrmContactItem = {
      ...ws.contacts[idx],
      ...updates,
      id: contactId,
      updatedAt: new Date().toISOString(),
    };
    ws.contacts[idx] = updated;
    this.saveWorkspace(tenantId, ws);
    return updated;
  }

  public static deleteContact(tenantId: string, contactId: string): boolean {
    const ws = this.getWorkspace(tenantId);
    const before = (ws.contacts || []).length;
    ws.contacts = (ws.contacts || []).filter((c) => c.id !== contactId);
    this.saveWorkspace(tenantId, ws);
    return (ws.contacts || []).length < before;
  }

  public static getCustomFields(tenantId: string, profileId?: string): CustomFieldDefinitionItem[] {
    const ws = this.getWorkspace(tenantId);
    const list = ws.customFields || [];
    return profileId ? list.filter((f) => !f.profileId || f.profileId === profileId) : list;
  }

  public static addCustomField(
    tenantId: string,
    params: { profileId: string; name: string; slug: string; type: any; description?: string }
  ): CustomFieldDefinitionItem {
    const ws = this.getWorkspace(tenantId);
    const item: CustomFieldDefinitionItem = {
      id: `cf_${Date.now().toString(36)}`,
      profileId: params.profileId,
      name: params.name.trim(),
      slug: params.slug.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      type: params.type || 'text',
      description: params.description,
      createdAt: new Date().toISOString(),
    };
    ws.customFields = [...(ws.customFields || []), item];
    this.saveWorkspace(tenantId, ws);
    return item;
  }

  public static updateCustomField(
    tenantId: string,
    id: string,
    updates: Partial<CustomFieldDefinitionItem>
  ): CustomFieldDefinitionItem | null {
    const ws = this.getWorkspace(tenantId);
    const idx = (ws.customFields || []).findIndex((f) => f.id === id);
    if (idx === -1) return null;
    const updated = { ...ws.customFields[idx], ...updates, id };
    ws.customFields[idx] = updated;
    this.saveWorkspace(tenantId, ws);
    return updated;
  }

  public static deleteCustomField(tenantId: string, id: string): boolean {
    const ws = this.getWorkspace(tenantId);
    const before = (ws.customFields || []).length;
    ws.customFields = (ws.customFields || []).filter((f) => f.id !== id);
    this.saveWorkspace(tenantId, ws);
    return (ws.customFields || []).length < before;
  }

  // ============================================================================
  // M6 PARITY: BROADCASTS, SEQUENCES & WORKFLOWS
  // ============================================================================

  public static getBroadcasts(tenantId: string, profileId?: string): BroadcastCampaignItem[] {
    const ws = this.getWorkspace(tenantId);
    const list = ws.broadcasts || [];
    return profileId ? list.filter((b) => !b.profileId || b.profileId === profileId) : list;
  }

  public static addBroadcast(
    tenantId: string,
    params: { profileId: string; name: string; platform: string; accountId: string; template?: any; message?: string; segmentFilters?: any }
  ): BroadcastCampaignItem {
    const ws = this.getWorkspace(tenantId);
    const item: BroadcastCampaignItem = {
      id: `bc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      profileId: params.profileId,
      name: params.name.trim(),
      platform: params.platform,
      accountId: params.accountId,
      template: params.template,
      message: params.message,
      segmentFilters: params.segmentFilters,
      status: 'draft',
      recipientsCount: 25,
      sentCount: 0,
      deliveredCount: 0,
      readCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    ws.broadcasts = [item, ...(ws.broadcasts || [])];
    this.saveWorkspace(tenantId, ws);
    return item;
  }

  public static sendBroadcast(tenantId: string, id: string): BroadcastCampaignItem | null {
    const ws = this.getWorkspace(tenantId);
    const target = (ws.broadcasts || []).find((b) => b.id === id);
    if (!target) return null;
    target.status = 'sent';
    target.sentCount = target.recipientsCount;
    target.deliveredCount = Math.floor(target.recipientsCount * 0.95);
    target.readCount = Math.floor(target.recipientsCount * 0.8);
    target.sentAt = new Date().toISOString();
    target.updatedAt = new Date().toISOString();
    this.saveWorkspace(tenantId, ws);
    return target;
  }

  public static getSequences(tenantId: string, profileId?: string): DripSequenceItem[] {
    const ws = this.getWorkspace(tenantId);
    const list = ws.sequences || [];
    return profileId ? list.filter((s) => !s.profileId || s.profileId === profileId) : list;
  }

  public static addSequence(
    tenantId: string,
    params: { profileId: string; name: string; platform: string; accountId: string; steps: any[] }
  ): DripSequenceItem {
    const ws = this.getWorkspace(tenantId);
    const item: DripSequenceItem = {
      id: `seq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      profileId: params.profileId,
      name: params.name.trim(),
      platform: params.platform,
      accountId: params.accountId,
      steps: params.steps || [],
      enrolledContactsCount: 0,
      status: 'draft',
      createdAt: new Date().toISOString(),
    };
    ws.sequences = [item, ...(ws.sequences || [])];
    this.saveWorkspace(tenantId, ws);
    return item;
  }

  public static updateSequence(tenantId: string, id: string, updates: Partial<DripSequenceItem>): DripSequenceItem | null {
    const ws = this.getWorkspace(tenantId);
    const target = (ws.sequences || []).find((s) => s.id === id);
    if (!target) return null;
    Object.assign(target, updates);
    this.saveWorkspace(tenantId, ws);
    return target;
  }

  public static enrollSequence(tenantId: string, id: string, contactIds: string[]): number {
    const ws = this.getWorkspace(tenantId);
    const target = (ws.sequences || []).find((s) => s.id === id);
    if (!target) return 0;
    const count = (contactIds || []).length;
    target.enrolledContactsCount = (target.enrolledContactsCount || 0) + count;
    this.saveWorkspace(tenantId, ws);
    return count;
  }

  public static getWorkflows(tenantId: string, profileId?: string): BranchingWorkflowItem[] {
    const ws = this.getWorkspace(tenantId);
    const list = ws.workflows || [];
    return profileId ? list.filter((w) => !w.profileId || w.profileId === profileId) : list;
  }

  public static addWorkflow(
    tenantId: string,
    params: { profileId: string; name: string; accountId?: string; platform?: string; trigger?: any; nodes: any[]; edges: any[] }
  ): BranchingWorkflowItem {
    const ws = this.getWorkspace(tenantId);
    const item: BranchingWorkflowItem = {
      id: `wf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      profileId: params.profileId,
      name: params.name.trim(),
      accountId: params.accountId,
      platform: params.platform,
      trigger: params.trigger || { type: 'dm_keyword', config: { keyword: 'START' } },
      nodes: params.nodes || [],
      edges: params.edges || [],
      status: 'draft',
      executionCount: 0,
      entryNodeId: params.nodes && params.nodes[0] ? params.nodes[0].id : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    ws.workflows = [item, ...(ws.workflows || [])];
    this.saveWorkspace(tenantId, ws);
    return item;
  }

  public static updateWorkflow(
    tenantId: string,
    id: string,
    updates: Partial<BranchingWorkflowItem>
  ): BranchingWorkflowItem | null {
    const ws = this.getWorkspace(tenantId);
    const target = (ws.workflows || []).find((w) => w.id === id);
    if (!target) return null;
    Object.assign(target, updates, { id, updatedAt: new Date().toISOString() });
    this.saveWorkspace(tenantId, ws);
    return target;
  }

  public static deleteWorkflow(tenantId: string, id: string): boolean {
    const ws = this.getWorkspace(tenantId);
    const before = (ws.workflows || []).length;
    ws.workflows = (ws.workflows || []).filter((w) => w.id !== id);
    this.saveWorkspace(tenantId, ws);
    return (ws.workflows || []).length < before;
  }

  public static triggerWorkflow(
    tenantId: string,
    id: string,
    payload: any
  ): { runId: string; status: string; workflowId: string; executedNodesCount: number } | null {
    const ws = this.getWorkspace(tenantId);
    const target = (ws.workflows || []).find((w) => w.id === id);
    if (!target) return null;
    target.executionCount = (target.executionCount || 0) + 1;
    this.saveWorkspace(tenantId, ws);
    return {
      runId: `run_${Date.now().toString(36)}`,
      status: 'completed',
      workflowId: id,
      executedNodesCount: target.nodes ? target.nodes.length : 1,
    };
  }

  // ============================================================================
  // M6 PARITY: TELEPHONY, VERIFY & RCS
  // ============================================================================

  public static addVerification(
    tenantId: string,
    params: { to: string; channel?: 'sms' | 'whatsapp' | 'voice'; brandName?: string; codeLength?: number }
  ): VerificationRequestItem {
    const ws = this.getWorkspace(tenantId);
    const length = Math.max(4, Math.min(8, Number(params.codeLength || 6)));
    const code = Math.floor(Math.pow(10, length - 1) + Math.random() * (Math.pow(10, length) - Math.pow(10, length - 1))).toString();
    const item: VerificationRequestItem = {
      id: `ver_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      to: params.to,
      code,
      channel: params.channel || 'sms',
      brandName: params.brandName || 'Asra3',
      status: 'pending',
      attempts: 0,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    ws.verifyRequests = [item, ...(ws.verifyRequests || [])];
    this.saveWorkspace(tenantId, ws);
    return item;
  }

  public static checkVerification(
    tenantId: string,
    toOrId: string,
    code: string
  ): { verified: boolean; status: string; reason?: string; verificationId?: string } {
    const ws = this.getWorkspace(tenantId);
    const target = (ws.verifyRequests || []).find(
      (v) => (v.id === toOrId || v.to === toOrId) && v.status === 'pending'
    );
    if (!target) {
      return { verified: false, status: 'failed', reason: 'verification_not_found_or_expired' };
    }
    target.attempts = (target.attempts || 0) + 1;
    if (new Date(target.expiresAt).getTime() < Date.now()) {
      target.status = 'expired';
      this.saveWorkspace(tenantId, ws);
      return { verified: false, status: 'expired', reason: 'code_expired' };
    }
    if (target.attempts > 5) {
      target.status = 'failed';
      this.saveWorkspace(tenantId, ws);
      return { verified: false, status: 'failed', reason: 'max_attempts_reached' };
    }
    if (target.code === code.trim()) {
      target.status = 'approved';
      this.saveWorkspace(tenantId, ws);
      return { verified: true, status: 'approved', verificationId: target.id };
    }
    this.saveWorkspace(tenantId, ws);
    return { verified: false, status: 'failed', reason: 'invalid_code', verificationId: target.id };
  }

  public static getBrandedIdentities(tenantId: string): BrandedIdentityItem[] {
    const ws = this.getWorkspace(tenantId);
    return ws.brandedIdentities || [];
  }

  public static addBrandedIdentity(
    tenantId: string,
    params: { displayName: string; callReasons: string[]; logoUrl?: string; authorizer?: any; references?: any }
  ): BrandedIdentityItem {
    const ws = this.getWorkspace(tenantId);
    const item: BrandedIdentityItem = {
      id: `bid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      displayName: params.displayName.trim(),
      callReasons: params.callReasons || [],
      logoUrl: params.logoUrl,
      authorizer: params.authorizer,
      references: params.references,
      status: 'requested',
      attachedNumbers: [],
      createdAt: new Date().toISOString(),
    };
    ws.brandedIdentities = [item, ...(ws.brandedIdentities || [])];
    this.saveWorkspace(tenantId, ws);
    return item;
  }

  public static getRcsAgents(tenantId: string): RcsAgentItem[] {
    const ws = this.getWorkspace(tenantId);
    return ws.rcsAgents || [];
  }

  public static addRcsAgent(
    tenantId: string,
    params: { name: string; displayName: string; description: string; logoUrl: string; heroImageUrl?: string; primaryColor?: string }
  ): RcsAgentItem {
    const ws = this.getWorkspace(tenantId);
    const item: RcsAgentItem = {
      id: `rcs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      name: params.name.trim(),
      displayName: params.displayName.trim(),
      description: params.description,
      logoUrl: params.logoUrl,
      heroImageUrl: params.heroImageUrl,
      primaryColor: params.primaryColor || '#0066FF',
      phoneNumbers: [],
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    ws.rcsAgents = [item, ...(ws.rcsAgents || [])];
    this.saveWorkspace(tenantId, ws);
    return item;
  }

  public static addRcsMessage(
    tenantId: string,
    params: { agentId: string; to: string; text: string; cards?: any[]; suggestions?: any[] }
  ): RcsMessageItem {
    const ws = this.getWorkspace(tenantId);
    const item: RcsMessageItem = {
      id: `rcs_msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      agentId: params.agentId,
      to: params.to,
      text: params.text,
      cards: params.cards,
      suggestions: params.suggestions,
      status: 'sent',
      channel: 'rcs',
      createdAt: new Date().toISOString(),
    };
    ws.rcsMessages = [item, ...(ws.rcsMessages || [])];
    this.saveWorkspace(tenantId, ws);
    return item;
  }

  public static getSmsRegistrations(tenantId: string): SmsRegistrationItem[] {
    const ws = this.getWorkspace(tenantId);
    return ws.smsRegistrations || [];
  }

  public static addSmsRegistration(
    tenantId: string,
    params: { registrationType: string; brand: any; campaign: any; tollFree?: any }
  ): SmsRegistrationItem {
    const ws = this.getWorkspace(tenantId);
    const item: SmsRegistrationItem = {
      id: `reg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      registrationType: params.registrationType,
      brand: params.brand,
      campaign: params.campaign,
      tollFree: params.tollFree,
      status: 'pending',
      awaitingOtp: params.registrationType === 'sole_prop_10dlc',
      createdAt: new Date().toISOString(),
    };
    ws.smsRegistrations = [item, ...(ws.smsRegistrations || [])];
    this.saveWorkspace(tenantId, ws);
    return item;
  }

  public static getPortingRequests(tenantId: string): PortingRequestItem[] {
    const ws = this.getWorkspace(tenantId);
    return ws.portingRequests || [];
  }

  public static addPortingRequest(
    tenantId: string,
    params: { phoneNumber: string; currentCarrier: string; accountNumber: string; pin: string; billingName: string; billingAddress: any; loaDocumentUrl?: string }
  ): PortingRequestItem {
    const ws = this.getWorkspace(tenantId);
    const item: PortingRequestItem = {
      id: `port_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      phoneNumber: params.phoneNumber,
      currentCarrier: params.currentCarrier,
      accountNumber: params.accountNumber,
      pin: params.pin,
      billingName: params.billingName,
      billingAddress: params.billingAddress,
      loaDocumentUrl: params.loaDocumentUrl,
      status: 'submitted',
      estimatedCompletionDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      requestedAt: new Date().toISOString(),
    };
    ws.portingRequests = [item, ...(ws.portingRequests || [])];
    this.saveWorkspace(tenantId, ws);
    return item;
  }

  public static getWhatsAppTemplates(tenantId: string, accountId?: string): WhatsAppTemplateItem[] {
    const ws = this.getWorkspace(tenantId);
    const list = ws.whatsappTemplates || [];
    return accountId ? list.filter((t) => t.accountId === accountId) : list;
  }

  public static addWhatsAppTemplate(
    tenantId: string,
    params: { accountId: string; name: string; category: any; language: string; components: any[] }
  ): WhatsAppTemplateItem {
    const ws = this.getWorkspace(tenantId);
    const item: WhatsAppTemplateItem = {
      id: `tpl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      accountId: params.accountId,
      name: params.name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      category: params.category || 'MARKETING',
      language: params.language || 'en_US',
      status: 'APPROVED',
      components: params.components || [],
      createdAt: new Date().toISOString(),
    };
    ws.whatsappTemplates = [item, ...(ws.whatsappTemplates || [])];
    this.saveWorkspace(tenantId, ws);
    return item;
  }

  public static getWhatsAppFlows(tenantId: string, accountId?: string): WhatsAppFlowItem[] {
    const ws = this.getWorkspace(tenantId);
    const list = ws.whatsappFlows || [];
    return accountId ? list.filter((f) => f.accountId === accountId) : list;
  }

  public static addWhatsAppFlow(
    tenantId: string,
    params: { accountId: string; name: string; categories: string[]; screens?: any[] }
  ): WhatsAppFlowItem {
    const ws = this.getWorkspace(tenantId);
    const item: WhatsAppFlowItem = {
      id: `flow_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      accountId: params.accountId,
      name: params.name.trim(),
      categories: params.categories || ['CUSTOMER_SUPPORT'],
      status: 'DRAFT',
      screens: params.screens || [],
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    ws.whatsappFlows = [item, ...(ws.whatsappFlows || [])];
    this.saveWorkspace(tenantId, ws);
    return item;
  }

  public static getMetaBusinessAgent(tenantId: string): MetaBusinessAgentSettings {
    const ws = this.getWorkspace(tenantId);
    return ws.metaBusinessAgent || {
      enabled: false,
      tone: 'professional',
      greeting: 'Hello! How can I help you today?',
      status: 'inactive',
    };
  }

  public static updateMetaBusinessAgent(
    tenantId: string,
    updates: Partial<MetaBusinessAgentSettings>
  ): MetaBusinessAgentSettings {
    const ws = this.getWorkspace(tenantId);
    const existing = ws.metaBusinessAgent || {
      enabled: false,
      tone: 'professional',
      greeting: 'Hello! How can I help you today?',
      status: 'inactive',
    };
    const updated: MetaBusinessAgentSettings = {
      ...existing,
      ...updates,
      status: updates.enabled ? 'active' : 'inactive',
      updatedAt: new Date().toISOString(),
    };
    ws.metaBusinessAgent = updated;
    this.saveWorkspace(tenantId, ws);
    return updated;
  }

  // ============================================================================
  // M6 PARITY: ADS, COMMERCE, BLOGS & GBP
  // ============================================================================

  public static getAdAudiences(tenantId: string, adAccountId?: string): AdAudienceItem[] {
    const ws = this.getWorkspace(tenantId);
    const list = ws.adAudiences || [];
    return adAccountId ? list.filter((a) => a.adAccountId === adAccountId) : list;
  }

  public static addAdAudience(
    tenantId: string,
    params: { adAccountId: string; name: string; subtype?: any; description?: string; customerList?: any[] }
  ): AdAudienceItem {
    const ws = this.getWorkspace(tenantId);
    const item: AdAudienceItem = {
      id: `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      adAccountId: params.adAccountId,
      name: params.name.trim(),
      subtype: params.subtype || 'CUSTOM',
      description: params.description,
      customerList: params.customerList || [],
      count: params.customerList ? params.customerList.length : 1200,
      status: 'ready',
      createdAt: new Date().toISOString(),
    };
    ws.adAudiences = [item, ...(ws.adAudiences || [])];
    this.saveWorkspace(tenantId, ws);
    return item;
  }

  public static getLeadGenForms(tenantId: string, accountId?: string): LeadGenFormItem[] {
    const ws = this.getWorkspace(tenantId);
    const list = ws.adLeadForms || [];
    return accountId ? list.filter((f) => f.accountId === accountId) : list;
  }

  public static addLeadGenForm(
    tenantId: string,
    params: { accountId: string; name: string; questions: Array<{ type: string; label: string }>; privacyPolicyUrl: string; pageId?: string }
  ): LeadGenFormItem {
    const ws = this.getWorkspace(tenantId);
    const item: LeadGenFormItem = {
      id: `form_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      accountId: params.accountId,
      pageId: params.pageId,
      name: params.name.trim(),
      questions: params.questions || [],
      privacyPolicyUrl: params.privacyPolicyUrl,
      status: 'active',
      leadsCount: 0,
      createdAt: new Date().toISOString(),
    };
    ws.adLeadForms = [item, ...(ws.adLeadForms || [])];
    this.saveWorkspace(tenantId, ws);
    return item;
  }

  public static getLeadGenLeads(tenantId: string, formId: string): LeadGenLeadRecord[] {
    const ws = this.getWorkspace(tenantId);
    return (ws.adLeads || []).filter((l) => l.formId === formId);
  }

  public static addLeadGenLead(
    tenantId: string,
    formId: string,
    fieldData: Record<string, string>
  ): LeadGenLeadRecord {
    const ws = this.getWorkspace(tenantId);
    const item: LeadGenLeadRecord = {
      id: `lead_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      formId,
      fieldData,
      submittedAt: new Date().toISOString(),
    };
    ws.adLeads = [item, ...(ws.adLeads || [])];
    const form = (ws.adLeadForms || []).find((f) => f.id === formId);
    if (form) form.leadsCount = (form.leadsCount || 0) + 1;
    this.saveWorkspace(tenantId, ws);
    return item;
  }

  public static getTrackingTags(tenantId: string, adAccountId?: string): TrackingTagItem[] {
    const ws = this.getWorkspace(tenantId);
    const list = ws.trackingTags || [];
    return adAccountId ? list.filter((t) => t.adAccountId === adAccountId) : list;
  }

  public static addTrackingTag(
    tenantId: string,
    params: { adAccountId: string; name: string; platform: string; tagId?: string }
  ): TrackingTagItem {
    const ws = this.getWorkspace(tenantId);
    const item: TrackingTagItem = {
      id: `tag_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      adAccountId: params.adAccountId,
      name: params.name.trim(),
      platform: params.platform,
      tagId: params.tagId || `pix_${Date.now().toString(36)}`,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    ws.trackingTags = [item, ...(ws.trackingTags || [])];
    this.saveWorkspace(tenantId, ws);
    return item;
  }

  public static getBlogs(tenantId: string, accountId?: string): BlogArticleItem[] {
    const ws = this.getWorkspace(tenantId);
    const list = ws.blogs || [];
    return accountId ? list.filter((b) => b.accountId === accountId) : list;
  }

  public static addBlogArticle(
    tenantId: string,
    params: { accountId: string; title: string; bodyHtml?: string; author?: string; tags?: string[]; isPublished?: boolean; blogId?: string; platform?: string }
  ): BlogArticleItem {
    const ws = this.getWorkspace(tenantId);
    const isPub = params.isPublished !== undefined ? Boolean(params.isPublished) : true;
    const item: BlogArticleItem = {
      id: `art_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      blogId: params.blogId || 'blog_primary',
      accountId: params.accountId,
      platform: params.platform || 'wordpress',
      title: params.title.trim(),
      bodyHtml: params.bodyHtml || '<p>Article content</p>',
      author: params.author || 'Admin',
      tags: params.tags || [],
      isPublished: isPub,
      postUrl: isPub ? `https://blog.example.com/${Date.now().toString(36)}` : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    ws.blogs = [item, ...(ws.blogs || [])];
    this.saveWorkspace(tenantId, ws);
    return item;
  }

  public static updateBlogArticle(
    tenantId: string,
    id: string,
    updates: Partial<BlogArticleItem>
  ): BlogArticleItem | null {
    const ws = this.getWorkspace(tenantId);
    const target = (ws.blogs || []).find((b) => b.id === id);
    if (!target) return null;
    Object.assign(target, updates, { id, updatedAt: new Date().toISOString() });
    this.saveWorkspace(tenantId, ws);
    return target;
  }

  public static deleteBlogArticle(tenantId: string, id: string): boolean {
    const ws = this.getWorkspace(tenantId);
    const before = (ws.blogs || []).length;
    ws.blogs = (ws.blogs || []).filter((b) => b.id !== id);
    this.saveWorkspace(tenantId, ws);
    return (ws.blogs || []).length < before;
  }

  public static getCommerceProducts(
    tenantId: string,
    filters?: { accountId?: string; status?: string }
  ): CommerceProductItem[] {
    const ws = this.getWorkspace(tenantId);
    let list = ws.commerceProducts || [];
    if (filters?.accountId) list = list.filter((p) => !p.accountId || p.accountId === filters.accountId);
    if (filters?.status) list = list.filter((p) => p.status === filters.status);
    return list;
  }

  public static addCommerceProduct(
    tenantId: string,
    params: { title: string; price: number; currency?: string; descriptionHtml?: string; inventoryQuantity?: number; images?: string[]; status?: 'active' | 'draft'; accountId?: string }
  ): CommerceProductItem {
    const ws = this.getWorkspace(tenantId);
    const item: CommerceProductItem = {
      id: `prod_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      accountId: params.accountId,
      title: params.title.trim(),
      handle: params.title.trim().toLowerCase().replace(/[^a-z0-9_]/g, '-'),
      descriptionHtml: params.descriptionHtml || '',
      price: Math.max(0, Number(params.price || 0)),
      currency: params.currency || 'USD',
      inventoryQuantity: Math.max(0, Number(params.inventoryQuantity || 10)),
      images: params.images || [],
      status: params.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    ws.commerceProducts = [item, ...(ws.commerceProducts || [])];
    this.saveWorkspace(tenantId, ws);
    return item;
  }

  public static updateCommerceProduct(
    tenantId: string,
    id: string,
    updates: Partial<CommerceProductItem>
  ): CommerceProductItem | null {
    const ws = this.getWorkspace(tenantId);
    const target = (ws.commerceProducts || []).find((p) => p.id === id);
    if (!target) return null;
    Object.assign(target, updates, { id, updatedAt: new Date().toISOString() });
    this.saveWorkspace(tenantId, ws);
    return target;
  }

  public static deleteCommerceProduct(tenantId: string, id: string): boolean {
    const ws = this.getWorkspace(tenantId);
    const before = (ws.commerceProducts || []).length;
    ws.commerceProducts = (ws.commerceProducts || []).filter((p) => p.id !== id);
    this.saveWorkspace(tenantId, ws);
    return (ws.commerceProducts || []).length < before;
  }

  public static getCommerceOrders(tenantId: string, accountId?: string): CommerceOrderItem[] {
    const ws = this.getWorkspace(tenantId);
    const list = ws.commerceOrders || [];
    return accountId ? list.filter((o) => !o.accountId || o.accountId === accountId) : list;
  }

  public static addCommerceOrder(
    tenantId: string,
    params: { orderNumber: string; customerName: string; customerEmail: string; total: number; currency?: string; accountId?: string; financialStatus?: any; fulfillmentStatus?: any }
  ): CommerceOrderItem {
    const ws = this.getWorkspace(tenantId);
    const item: CommerceOrderItem = {
      id: `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      accountId: params.accountId,
      orderNumber: params.orderNumber || `#${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      total: Math.max(0, Number(params.total || 0)),
      currency: params.currency || 'USD',
      financialStatus: params.financialStatus || 'paid',
      fulfillmentStatus: params.fulfillmentStatus || 'fulfilled',
      createdAt: new Date().toISOString(),
    };
    ws.commerceOrders = [item, ...(ws.commerceOrders || [])];
    this.saveWorkspace(tenantId, ws);
    return item;
  }

  public static getCommerceDiscounts(tenantId: string, accountId?: string): CommerceDiscountItem[] {
    const ws = this.getWorkspace(tenantId);
    const list = ws.commerceDiscounts || [];
    return accountId ? list.filter((d) => !d.accountId || d.accountId === accountId) : list;
  }

  public static addCommerceDiscount(
    tenantId: string,
    params: { code: string; discountType: 'percentage' | 'fixed_amount'; value: number; accountId?: string; startsAt?: string; endsAt?: string }
  ): CommerceDiscountItem {
    const ws = this.getWorkspace(tenantId);
    const item: CommerceDiscountItem = {
      id: `disc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      accountId: params.accountId,
      code: params.code.trim().toUpperCase(),
      discountType: params.discountType || 'percentage',
      value: Math.max(0, Number(params.value || 10)),
      startsAt: params.startsAt || new Date().toISOString(),
      endsAt: params.endsAt,
      usedCount: 0,
      active: true,
      createdAt: new Date().toISOString(),
    };
    ws.commerceDiscounts = [item, ...(ws.commerceDiscounts || [])];
    this.saveWorkspace(tenantId, ws);
    return item;
  }

  public static updateCommerceDiscount(
    tenantId: string,
    id: string,
    updates: Partial<CommerceDiscountItem>
  ): CommerceDiscountItem | null {
    const ws = this.getWorkspace(tenantId);
    const target = (ws.commerceDiscounts || []).find((d) => d.id === id);
    if (!target) return null;
    Object.assign(target, updates);
    this.saveWorkspace(tenantId, ws);
    return target;
  }

  public static deleteCommerceDiscount(tenantId: string, id: string): boolean {
    const ws = this.getWorkspace(tenantId);
    const before = (ws.commerceDiscounts || []).length;
    ws.commerceDiscounts = (ws.commerceDiscounts || []).filter((d) => d.id !== id);
    this.saveWorkspace(tenantId, ws);
    return (ws.commerceDiscounts || []).length < before;
  }

  public static getGoogleBusinessServices(tenantId: string, accountId?: string): GoogleBusinessServiceItem[] {
    const ws = this.getWorkspace(tenantId);
    const list = ws.googleBusinessServices || [];
    return accountId ? list.filter((s) => s.accountId === accountId) : list;
  }

  public static addGoogleBusinessService(
    tenantId: string,
    params: { accountId: string; displayName: string; description?: string; price?: { currencyCode: string; units: number } }
  ): GoogleBusinessServiceItem {
    const ws = this.getWorkspace(tenantId);
    const item: GoogleBusinessServiceItem = {
      id: `gbp_srv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      accountId: params.accountId,
      displayName: params.displayName.trim(),
      description: params.description,
      price: params.price,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    ws.googleBusinessServices = [item, ...(ws.googleBusinessServices || [])];
    this.saveWorkspace(tenantId, ws);
    return item;
  }

  public static updateGoogleBusinessService(
    tenantId: string,
    id: string,
    updates: Partial<GoogleBusinessServiceItem>
  ): GoogleBusinessServiceItem | null {
    const ws = this.getWorkspace(tenantId);
    const target = (ws.googleBusinessServices || []).find((s) => s.id === id);
    if (!target) return null;
    Object.assign(target, updates, { id, updatedAt: new Date().toISOString() });
    this.saveWorkspace(tenantId, ws);
    return target;
  }

  public static deleteGoogleBusinessService(tenantId: string, id: string): boolean {
    const ws = this.getWorkspace(tenantId);
    const before = (ws.googleBusinessServices || []).length;
    ws.googleBusinessServices = (ws.googleBusinessServices || []).filter((s) => s.id !== id);
    this.saveWorkspace(tenantId, ws);
    return (ws.googleBusinessServices || []).length < before;
  }
}

