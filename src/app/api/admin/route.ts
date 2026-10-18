import { NextResponse } from 'next/server';
import { SuperAdminService } from '@/lib/services/super-admin.service';
import { getSessionFromCookieHeader } from '@/lib/auth/session';

/**
 * SUPER ADMIN CONTROL PLANE API (`/api/admin`)
 * Allows the SaaS Super Admin to read and control:
 * - Global enabled platforms (16 social + 8 ad networks)
 * - Global enabled OAuth scopes (`posting`, `analytics`, `comments`, `messaging`, `ads`)
 * - Global enabled sub-services (`core_connect`, `publishing`, `inbox_crm`, `analytics`, `ads`, `telephony`, `commerce_local`, `support_ai`)
 * - Subscription plan templates & quotas
 * - Per-tenant overrides, suspension, and white-label branding
 * - Minting Zernio Scoped API Keys (`POST /v1/api-keys` with `scope: "profiles"` & `disabledResourceGroups`)
 * - Wholesale vs. Retail billing margin report (`GET /v1/usage?range=cycle&groupBy=profile`)
 */
export async function GET(request: Request) {
  try {
    const session = getSessionFromCookieHeader(request.headers.get('cookie'));
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Super Admin access required' },
        { status: 401 }
      );
    }

    const [controlPlane, billingReport] = await Promise.all([
      SuperAdminService.getControlPlaneSnapshot(),
      SuperAdminService.getWholesaleVsRetailBillingReport(),
    ]);

    return NextResponse.json({
      ...controlPlane,
      billingReport,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Admin snapshot failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = getSessionFromCookieHeader(request.headers.get('cookie'));
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Super Admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const action = body.action as string;

    if (action === 'update_global_config') {
      const globalConfig = await SuperAdminService.updateGlobalConfig(
        body.patch || {}
      );
      const [controlPlane, billingReport] = await Promise.all([
        SuperAdminService.getControlPlaneSnapshot(),
        SuperAdminService.getWholesaleVsRetailBillingReport(),
      ]);
      return NextResponse.json({
        ok: true,
        globalConfig,
        snapshot: { ...controlPlane, billingReport },
      });
    }

    if (action === 'update_plan_template') {
      const plan = await SuperAdminService.updatePlanTemplate(
        body.planKey as string,
        body.patch || {}
      );
      const [controlPlane, billingReport] = await Promise.all([
        SuperAdminService.getControlPlaneSnapshot(),
        SuperAdminService.getWholesaleVsRetailBillingReport(),
      ]);
      return NextResponse.json({
        ok: true,
        plan,
        snapshot: { ...controlPlane, billingReport },
      });
    }

    if (action === 'update_tenant_override') {
      const tenant = await SuperAdminService.updateTenantOverride(
        body.organizationId as string,
        body.patch || {}
      );
      const [controlPlane, billingReport] = await Promise.all([
        SuperAdminService.getControlPlaneSnapshot(),
        SuperAdminService.getWholesaleVsRetailBillingReport(),
      ]);
      return NextResponse.json({
        ok: true,
        tenant,
        snapshot: { ...controlPlane, billingReport },
      });
    }

    if (action === 'mint_scoped_key') {
      const minted = await SuperAdminService.mintTenantScopedApiKey({
        organizationId: body.organizationId as string,
        permission: body.permission as 'read' | 'write' | undefined,
        expiresInDays: body.expiresInDays as number | undefined,
      });
      const [controlPlane, billingReport] = await Promise.all([
        SuperAdminService.getControlPlaneSnapshot(),
        SuperAdminService.getWholesaleVsRetailBillingReport(),
      ]);
      return NextResponse.json({
        ok: true,
        minted,
        snapshot: { ...controlPlane, billingReport },
      });
    }

    if (action === 'create_tenant') {
      const tenant = await SuperAdminService.createTenantOrganization({
        organizationName: body.organizationName as string,
        planKey: body.planKey as string | undefined,
        primaryColor: body.primaryColor as string | undefined,
        language: body.language as 'en' | 'es' | 'pt-BR' | undefined,
      });
      const [controlPlane, billingReport] = await Promise.all([
        SuperAdminService.getControlPlaneSnapshot(),
        SuperAdminService.getWholesaleVsRetailBillingReport(),
      ]);
      return NextResponse.json({
        ok: true,
        tenant,
        snapshot: { ...controlPlane, billingReport },
      });
    }

    if (action === 'delete_tenant') {
      await SuperAdminService.deleteTenantOrganization(
        body.organizationId as string
      );
      const [controlPlane, billingReport] = await Promise.all([
        SuperAdminService.getControlPlaneSnapshot(),
        SuperAdminService.getWholesaleVsRetailBillingReport(),
      ]);
      return NextResponse.json({
        ok: true,
        snapshot: { ...controlPlane, billingReport },
      });
    }

    return NextResponse.json(
      { error: `Unknown admin action: ${action}` },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Admin update failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
