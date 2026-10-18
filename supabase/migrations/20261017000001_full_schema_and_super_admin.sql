-- =============================================================================
-- MULTI-TENANT WHITE-LABEL SAAS PLATFORM (SUPABASE + ZERNIO SUB-SERVICES)
-- Complete Schema: Super Admin Control Plane, Multi-Tenant Orgs, Scopes,
-- Connected Accounts, Publishing, Queues, Inbox/CRM/Workflows, Analytics,
-- 8-Network Ads, Cloud Telephony/AI Voice/WhatsApp, Commerce, and AI Support.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. SUPER ADMIN & GLOBAL PLATFORM CONTROL PLANE
-- -----------------------------------------------------------------------------

create table if not exists public.super_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'owner' check (role in ('owner', 'admin', 'ops')),
  created_at timestamptz not null default now()
);

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.super_admins where user_id = auth.uid()
  );
$$;

-- Global switches controlled by Super Admin across the entire SaaS
create table if not exists public.platform_global_config (
  id int primary key default 1 check (id = 1),
  brand_name text not null default 'OmniPulse Cloud',
  brand_logo_url text,
  brand_primary_color text not null default '#4F46E5',
  enforce_headless_oauth boolean not null default true,
  -- Globally enabled social/blog/messaging platforms
  enabled_platforms text[] not null default array[
    'instagram', 'facebook', 'tiktok', 'linkedin', 'twitter', 'youtube',
    'threads', 'pinterest', 'reddit', 'bluesky', 'snapchat', 'googlebusiness',
    'telegram', 'discord', 'slack', 'whatsapp', 'shopify', 'wordpress'
  ],
  -- Globally enabled ad platforms
  enabled_ad_platforms text[] not null default array[
    'metaads', 'googleads', 'linkedinads', 'tiktokads',
    'pinterestads', 'xads', 'redditads', 'openaiads'
  ],
  -- Globally allowed OAuth scopes per connect flow
  enabled_oauth_scopes text[] not null default array[
    'posting', 'analytics', 'comments', 'messaging', 'ads'
  ],
  -- Globally enabled sub-services
  enabled_subservices text[] not null default array[
    'core_connect', 'publishing', 'inbox_crm', 'analytics',
    'ads', 'telephony', 'commerce_local', 'support_ai'
  ],
  -- Global safety caps
  default_max_support_cost_usd numeric(6,2) not null default 3.00,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

insert into public.platform_global_config (id)
values (1)
on conflict (id) do nothing;

-- Subscription Plan Templates (Admin defines tiers & what each tier unlocks)
create table if not exists public.subscription_plan_templates (
  plan_key text primary key, -- 'starter', 'growth', 'agency', 'enterprise'
  display_name text not null,
  monthly_price_usd numeric(10,2) not null,
  enabled_subservices text[] not null,
  allowed_platforms text[] not null,
  allowed_ad_platforms text[] not null,
  allowed_oauth_scopes text[] not null,
  disabled_zernio_resource_groups text[] not null default '{}',
  max_connected_accounts int not null default 5,
  max_monthly_posts int not null default 500,
  max_monthly_messages int not null default 10000,
  max_managed_ads int not null default 50,
  max_phone_numbers int not null default 1,
  max_ai_support_usd numeric(8,2) not null default 10.00,
  max_x_api_spend_usd numeric(8,2) not null default 0.00,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.subscription_plan_templates (
  plan_key, display_name, monthly_price_usd,
  enabled_subservices, allowed_platforms, allowed_ad_platforms, allowed_oauth_scopes,
  disabled_zernio_resource_groups,
  max_connected_accounts, max_monthly_posts, max_monthly_messages, max_managed_ads,
  max_phone_numbers, max_ai_support_usd, max_x_api_spend_usd
) values
(
  'starter', 'Starter', 29.00,
  array['core_connect', 'publishing', 'analytics'],
  array['instagram', 'facebook', 'tiktok', 'linkedin', 'threads', 'pinterest', 'bluesky', 'youtube'],
  array[]::text[],
  array['posting', 'analytics'],
  array['ads', 'telephony', 'billing'],
  5, 300, 1000, 0, 0, 5.00, 0.00
),
(
  'growth', 'Growth & Inbox', 79.00,
  array['core_connect', 'publishing', 'inbox_crm', 'analytics', 'commerce_local', 'support_ai'],
  array['instagram', 'facebook', 'tiktok', 'linkedin', 'twitter', 'youtube', 'threads', 'pinterest', 'reddit', 'bluesky', 'googlebusiness', 'telegram', 'discord', 'slack', 'shopify', 'wordpress'],
  array[]::text[],
  array['posting', 'analytics', 'comments', 'messaging'],
  array['ads', 'telephony', 'billing'],
  15, 2000, 10000, 0, 1, 20.00, 15.00
),
(
  'agency', 'Agency Omnichannel + Ads', 199.00,
  array['core_connect', 'publishing', 'inbox_crm', 'analytics', 'ads', 'telephony', 'commerce_local', 'support_ai'],
  array['instagram', 'facebook', 'tiktok', 'linkedin', 'twitter', 'youtube', 'threads', 'pinterest', 'reddit', 'bluesky', 'snapchat', 'googlebusiness', 'telegram', 'discord', 'slack', 'whatsapp', 'shopify', 'wordpress'],
  array['metaads', 'googleads', 'linkedinads', 'tiktokads', 'pinterestads', 'xads', 'redditads', 'openaiads'],
  array['posting', 'analytics', 'comments', 'messaging', 'ads'],
  array['billing'],
  50, 10000, 50000, 500, 5, 50.00, 50.00
),
(
  'enterprise', 'Enterprise Full White-Label', 499.00,
  array['core_connect', 'publishing', 'inbox_crm', 'analytics', 'ads', 'telephony', 'commerce_local', 'support_ai'],
  array['instagram', 'facebook', 'tiktok', 'linkedin', 'twitter', 'youtube', 'threads', 'pinterest', 'reddit', 'bluesky', 'snapchat', 'googlebusiness', 'telegram', 'discord', 'slack', 'whatsapp', 'shopify', 'wordpress'],
  array['metaads', 'googleads', 'linkedinads', 'tiktokads', 'pinterestads', 'xads', 'redditads', 'openaiads'],
  array['posting', 'analytics', 'comments', 'messaging', 'ads'],
  array[]::text[],
  500, 100000, 500000, 5000, 50, 100.00, 250.00
)
on conflict (plan_key) do nothing;

-- -----------------------------------------------------------------------------
-- 2. MULTI-TENANT ORGANIZATIONS & PER-TENANT ADMIN OVERRIDES
-- -----------------------------------------------------------------------------

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  -- Maps 1:1 to Zernio Profile (_id) where externalId = organizations.id::text
  zernio_profile_id text unique,
  -- Optional Zernio Scoped API Key minted specifically for this tenant
  zernio_scoped_key_id text,
  zernio_scoped_key_prefix text,
  plan_key text not null default 'agency' references public.subscription_plan_templates(plan_key),
  status text not null default 'active' check (status in ('active', 'suspended', 'past_due', 'Archived')),
  -- Tenant-level White-Label Branding (used for KYC share links, WhatsApp signup, dashboard)
  white_label_config jsonb not null default '{
    "companyName": "My Brand",
    "logoUrl": "",
    "primaryColor": "#4F46E5",
    "language": "en"
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.org_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  unique(organization_id, user_id)
);

-- Per-tenant granular overrides controlled by Super Admin
create table if not exists public.org_feature_overrides (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  custom_enabled_subservices text[],
  custom_allowed_platforms text[],
  custom_allowed_ad_platforms text[],
  custom_allowed_oauth_scopes text[],
  custom_disabled_resource_groups text[],
  custom_max_connected_accounts int,
  custom_max_monthly_posts int,
  custom_max_monthly_messages int,
  custom_max_managed_ads int,
  custom_max_phone_numbers int,
  custom_max_ai_support_usd numeric(8,2),
  custom_max_x_api_spend_usd numeric(8,2),
  force_headless_mode boolean not null default true,
  admin_notes text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id),
  target_organization_id uuid references public.organizations(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Helper function for RLS
create or replace function public.user_org_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select organization_id from public.org_members where user_id = auth.uid();
$$;

-- -----------------------------------------------------------------------------
-- 3. CONNECTED ACCOUNTS, GROUPS & WEBHOOK DEDUPLICATION
-- -----------------------------------------------------------------------------

create table if not exists public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  zernio_account_id text not null unique,
  zernio_profile_id text not null,
  platform text not null,
  username text,
  display_name text,
  avatar_url text,
  is_active boolean not null default true,
  health_status text not null default 'healthy' check (health_status in ('healthy', 'warning', 'error', 'disconnected')),
  can_post boolean not null default true,
  can_fetch_analytics boolean not null default true,
  needs_reconnect boolean not null default false,
  granted_scopes text[] not null default '{}',
  health_issues text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  last_health_check_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_connected_accounts_org on public.connected_accounts(organization_id);

create table if not exists public.account_groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  zernio_group_id text unique,
  name text not null,
  account_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.webhook_events_dedup (
  event_id text primary key,
  event_type text not null,
  organization_id uuid references public.organizations(id) on delete set null,
  zernio_profile_id text,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 4. SUB-SERVICE 2: OMNICHANNEL PUBLISHING, QUEUES & MEDIA
-- -----------------------------------------------------------------------------

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  zernio_post_id text unique,
  idempotency_key text not null unique,
  content text not null,
  media_items jsonb not null default '[]'::jsonb,
  platforms jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'publishing', 'published', 'partial', 'failed')),
  scheduled_for timestamptz,
  timezone text not null default 'UTC',
  queued_from_profile boolean not null default false,
  zernio_queue_id text,
  published_at timestamptz,
  error_details jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_posts_org_status on public.posts(organization_id, status);

create table if not exists public.queue_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  zernio_queue_id text unique,
  name text not null,
  timezone text not null default 'UTC',
  slots jsonb not null default '[]'::jsonb, -- [{ dayOfWeek: 1, time: "09:00" }]
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 5. SUB-SERVICE 3: UNIFIED INBOX, CRM, BROADCASTS, SEQUENCES & WORKFLOWS
-- -----------------------------------------------------------------------------

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  zernio_contact_id text unique,
  display_name text,
  email text,
  phone text,
  channels jsonb not null default '[]'::jsonb,
  custom_fields jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inbox_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  zernio_conversation_id text not null unique,
  zernio_account_id text not null,
  platform text not null,
  participant_name text,
  participant_username text,
  participant_id text,
  status text not null default 'active',
  unread_count int not null default 0,
  last_message_text text,
  last_message_at timestamptz not null default now(),
  ai_standby boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_inbox_conv_org on public.inbox_conversations(organization_id, last_message_at desc);

create table if not exists public.inbox_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.inbox_conversations(id) on delete cascade,
  zernio_message_id text not null unique,
  platform text not null,
  direction text not null check (direction in ('incoming', 'outgoing')),
  text_content text,
  attachments jsonb not null default '[]'::jsonb,
  delivery_status text not null default 'sent' check (delivery_status in ('accepted', 'sent', 'delivered', 'read', 'failed')),
  sender_info jsonb not null default '{}'::jsonb,
  error_message text,
  sent_at timestamptz not null default now()
);

create table if not exists public.growth_automations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  zernio_resource_id text unique,
  automation_type text not null check (automation_type in ('comment_to_dm', 'broadcast', 'sequence', 'workflow')),
  name text not null,
  status text not null default 'draft',
  config jsonb not null default '{}'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 6. SUB-SERVICE 4: ANALYTICS SYNC CACHE
-- -----------------------------------------------------------------------------

create table if not exists public.analytics_dashboard_cache (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  from_date date not null,
  to_date date not null,
  platform text not null default 'all',
  totals jsonb not null default '{}'::jsonb,
  previous_totals jsonb not null default '{}'::jsonb,
  followers jsonb not null default '{}'::jsonb,
  daily_series jsonb not null default '[]'::jsonb,
  top_posts jsonb not null default '[]'::jsonb,
  data_as_of timestamptz not null default now(),
  synced_at timestamptz not null default now(),
  unique(organization_id, from_date, to_date, platform)
);

-- -----------------------------------------------------------------------------
-- 7. SUB-SERVICE 5: CROSS-PLATFORM ADS (8 NETWORKS) & CAPI
-- -----------------------------------------------------------------------------

create table if not exists public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  zernio_ad_account_id text not null,
  zernio_campaign_id text unique,
  platform text not null, -- metaads, googleads, linkedinads, tiktokads, pinterestads, xads, redditads, openaiads
  name text not null,
  objective text,
  status text not null default 'PAUSED',
  daily_budget_usd numeric(12,2),
  metrics_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 8. SUB-SERVICE 6: TELEPHONY, AI VOICE, SMS, RCS & WHATSAPP
-- -----------------------------------------------------------------------------

create table if not exists public.phone_numbers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  zernio_number_id text not null unique,
  e164_number text,
  country_code text not null,
  number_type text not null default 'local',
  status text not null default 'active', -- active, pending_regulatory, kyc_required, regulatory_declined
  voice_enabled boolean not null default true,
  sms_enabled boolean not null default false,
  whatsapp_enabled boolean not null default false,
  forward_to text, -- e.g. wss://... or sip:agent@sip.vapi.ai
  kyc_share_url text,
  sms_registration_share_url text,
  branded_calling_share_url text,
  monthly_cost_usd numeric(8,2) not null default 3.00,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 9. SUB-SERVICE 7 & 8: COMMERCE STORES, BLOGS & AI SUPPORT RUNS
-- -----------------------------------------------------------------------------

create table if not exists public.commerce_stores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  zernio_account_id text not null unique,
  platform text not null check (platform in ('shopify', 'woocommerce')),
  store_name text,
  domain text,
  currency text,
  capabilities text[] not null default '{}',
  missing_capabilities text[] not null default '{}',
  grant_permissions_url text,
  synced_at timestamptz not null default now()
);

create table if not exists public.ai_support_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  zernio_run_id text not null unique,
  zernio_thread_id text,
  question text not null,
  context jsonb not null default '{}'::jsonb, -- { postId, accountId, profileId }
  status text not null default 'queued', -- queued, running, completed, needs_human, failed
  answer text,
  cost_usd numeric(8,6) default 0,
  max_cost_usd numeric(6,2) not null default 3.00,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.tenant_usage_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  billing_cycle text not null, -- e.g. '2026-10'
  zernio_wholesale_usd numeric(10,2) not null default 0,
  tenant_retail_usd numeric(10,2) not null default 0,
  breakdown jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  unique(organization_id, billing_cycle)
);

-- -----------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------

alter table public.super_admins enable row level security;
alter table public.platform_global_config enable row level security;
alter table public.subscription_plan_templates enable row level security;
alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.org_feature_overrides enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.connected_accounts enable row level security;
alter table public.account_groups enable row level security;
alter table public.posts enable row level security;
alter table public.queue_schedules enable row level security;
alter table public.contacts enable row level security;
alter table public.inbox_conversations enable row level security;
alter table public.inbox_messages enable row level security;
alter table public.growth_automations enable row level security;
alter table public.analytics_dashboard_cache enable row level security;
alter table public.ad_campaigns enable row level security;
alter table public.phone_numbers enable row level security;
alter table public.commerce_stores enable row level security;
alter table public.ai_support_runs enable row level security;
alter table public.tenant_usage_snapshots enable row level security;

-- Super Admin full access policies + Tenant scoped policies
create policy "Super admins manage global config" on public.platform_global_config
  for all using (public.is_super_admin());

create policy "Anyone authenticated can read global config" on public.platform_global_config
  for select using (auth.role() = 'authenticated');

create policy "Anyone can read active plan templates" on public.subscription_plan_templates
  for select using (true);

create policy "Super admins manage plan templates" on public.subscription_plan_templates
  for all using (public.is_super_admin());

create policy "Tenant members or super admin access organizations" on public.organizations
  for all using (public.is_super_admin() or id in (select public.user_org_ids()));

create policy "Tenant members or super admin access overrides" on public.org_feature_overrides
  for select using (public.is_super_admin() or organization_id in (select public.user_org_ids()));

create policy "Only super admin writes overrides" on public.org_feature_overrides
  for all using (public.is_super_admin());

create policy "Tenant members or super admin access accounts" on public.connected_accounts
  for all using (public.is_super_admin() or organization_id in (select public.user_org_ids()));

create policy "Tenant members or super admin access posts" on public.posts
  for all using (public.is_super_admin() or organization_id in (select public.user_org_ids()));

create policy "Tenant members or super admin access queues" on public.queue_schedules
  for all using (public.is_super_admin() or organization_id in (select public.user_org_ids()));

create policy "Tenant members or super admin access conversations" on public.inbox_conversations
  for all using (public.is_super_admin() or organization_id in (select public.user_org_ids()));

create policy "Tenant members or super admin access messages" on public.inbox_messages
  for all using (public.is_super_admin() or organization_id in (select public.user_org_ids()));

create policy "Tenant members or super admin access contacts" on public.contacts
  for all using (public.is_super_admin() or organization_id in (select public.user_org_ids()));

create policy "Tenant members or super admin access automations" on public.growth_automations
  for all using (public.is_super_admin() or organization_id in (select public.user_org_ids()));

create policy "Tenant members or super admin access analytics" on public.analytics_dashboard_cache
  for all using (public.is_super_admin() or organization_id in (select public.user_org_ids()));

create policy "Tenant members or super admin access ads" on public.ad_campaigns
  for all using (public.is_super_admin() or organization_id in (select public.user_org_ids()));

create policy "Tenant members or super admin access phone numbers" on public.phone_numbers
  for all using (public.is_super_admin() or organization_id in (select public.user_org_ids()));

create policy "Tenant members or super admin access commerce" on public.commerce_stores
  for all using (public.is_super_admin() or organization_id in (select public.user_org_ids()));

create policy "Tenant members or super admin access support runs" on public.ai_support_runs
  for all using (public.is_super_admin() or organization_id in (select public.user_org_ids()));

create policy "Tenant members or super admin access usage snapshots" on public.tenant_usage_snapshots
  for select using (public.is_super_admin() or organization_id in (select public.user_org_ids()));
