import { TenantAccessError, type TenantRole } from '@/lib/auth/tenant-access';
import { saasDatabase } from '@/lib/saas/storage';
import { PRICING, starterMonthlyMinor } from './pricing';

type Row = Record<string, any>;
async function read(query: PromiseLike<{data:any;error:any}>):Promise<any> { const {data,error}=await query;if(error)throw new TenantAccessError(503,'Billing records could not be verified. Apply the customer wallet migration before using billing.');return data; }
async function invoiceHistory(org:string):Promise<Row[]> {
  const result:Row[]=[];
  for(let offset=0;;offset+=500){
    const page=await read(saasDatabase().from('billing_recurring_invoices').select('*').eq('organization_id',org).order('period_start',{ascending:false}).order('id').range(offset,offset+499));
    if(!Array.isArray(page))throw new TenantAccessError(503,'Invoice history is unavailable.');
    result.push(...page);if(page.length<500)return result;
  }
}
function monthAt(anchor:Date,offset:number) { const y=anchor.getUTCFullYear(),m=anchor.getUTCMonth()+offset;return new Date(Date.UTC(y,m,Math.min(anchor.getUTCDate(),new Date(Date.UTC(y,m+1,0)).getUTCDate()),anchor.getUTCHours(),anchor.getUTCMinutes(),anchor.getUTCSeconds(),anchor.getUTCMilliseconds())); }
function missingRentalPeriod(agreement:Row,invoices:Row[],now=new Date()) {
  const start=new Date(agreement.evidence.startsAt),current=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1));
  if(!Number.isFinite(start.getTime()))return true;
  const paid=new Set(invoices.filter(i=>i.agreement_id===agreement.id&&i.state==='paid').map(i=>new Date(i.period_start).toISOString()));
  for(let date=start;date<current;date=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1))){if(!paid.has(date.toISOString()))return true;}
  return false;
}
export function billingPeriod(startsAt:string,kind:string,now=new Date()) {
  const start=new Date(startsAt);if(!Number.isFinite(start.getTime()))throw new TenantAccessError(503,'The recurring agreement has no verified start date.');
  if(start>now)return null;
  let offset=(now.getUTCFullYear()-start.getUTCFullYear())*12+now.getUTCMonth()-start.getUTCMonth();
  if(monthAt(start,offset)>now)offset--;
  const from=kind==='phone_rental'?new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)):monthAt(start,offset);
  const to=kind==='phone_rental'?new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,1)):monthAt(start,offset+1);
  return {from:from.toISOString(),to:to.toISOString()};
}
export class BillingWorkspaceService {
  static async agreements(org:string):Promise<Row[]> {return read(saasDatabase().from('billing_recurring_agreements').select('*').eq('organization_id',org));}
  static async subscription(org:string) {
    const rows=await this.agreements(org),agreement=rows.find(a=>a.agreement_key==='subscription');
    if(!agreement)return null;
    const period=billingPeriod(agreement.evidence.startsAt,'starter');
    const invoice=period?await read(saasDatabase().from('billing_recurring_invoices').select('state').eq('agreement_id',agreement.id).eq('period_start',period.from).maybeSingle()):null;
    return {planKey:'starter',status:invoice?.state==='paid'?'active':!agreement.active?'cancelled':'payment_due',cancelAtPeriodEnd:!agreement.active,monthlyMinor:agreement.amount_minor,extraAccounts:Number(agreement.evidence.extraAccounts)||0,periodEnd:period?.to};
  }
  static async assertSubscription(org:string) {
    const subscription=await this.subscription(org);
    // Existing private-beta workspaces retain their explicitly configured policy until they subscribe.
    if(subscription&&subscription.status!=='active')throw new TenantAccessError(402,'Subscription payment is due. Fund the wallet and renew from Billing before new paid actions.');
    const agreements=(await this.agreements(org)).filter(a=>a.active&&a.kind==='phone_rental');
    if(agreements.length){const invoices=await invoiceHistory(org);if(agreements.some(a=>missingRentalPeriod(a,invoices)))throw new TenantAccessError(409,'An earlier number renewal needs administrator reconciliation. New paid actions are paused; no past charge has been assumed.');}
  }
  static async subscribe(org:string,actorId:string,extraAccounts:unknown,accepted:unknown) {
    if(accepted!==true||!Number.isSafeInteger(extraAccounts)||Number(extraAccounts)<0||Number(extraAccounts)>100)throw new TenantAccessError(400,'Review the monthly price and select 0–100 extra connections.');
    const existing=(await this.agreements(org)).find(a=>a.agreement_key==='subscription');
    if(existing&&Number(existing.evidence.extraAccounts)!==extraAccounts)throw new TenantAccessError(409,'A different subscription is already recorded. Mid-cycle plan changes are coming soon; no additional charge was made.');
    if(!existing){
      const organization=await read(saasDatabase().from('organizations').select('zernio_profile_id').eq('id',org).single());
      if(!organization)throw new TenantAccessError(503,'The workspace could not be verified before subscription enrollment.');
      if(organization.zernio_profile_id){
        const profileId=organization.zernio_profile_id;
        if(typeof profileId!=='string')throw new TenantAccessError(503,'The workspace profile could not be verified.');
        const {zernioClient}=await import('@/lib/zernio/client');
        const {data}=await zernioClient.request<{accounts?:Row[]}>({method:'GET',path:'/accounts',query:{profileId}});
        if(!Array.isArray(data.accounts)||data.accounts.some(a=>!a._id||typeof a.platform!=='string'||(typeof a.profileId==='string'?a.profileId:a.profileId?._id)!==profileId))throw new TenantAccessError(503,'Connected accounts could not be verified before subscription enrollment.');
        const connected=new Set(data.accounts.filter(a=>!['phone','sms'].includes(a.platform)).map(a=>a._id)).size;
        if(connected>PRICING.includedAccounts+Number(extraAccounts))throw new TenantAccessError(409,`This workspace has ${connected} connected accounts. Review at least ${connected-PRICING.includedAccounts} extra connections or disconnect the excess accounts before subscribing.`);
      }
      const evidence={startsAt:new Date().toISOString(),extraAccounts,acceptedBy:actorId,termsVersion:PRICING.version,terms:'Monthly automatic wallet renewal; number rental and usage separate; unpaid service pauses; no automatic number release.'};
      await read(saasDatabase().rpc('billing_set_agreement',{p_org:org,p_key:'subscription',p_kind:'starter',p_amount:starterMonthlyMinor(2+Number(extraAccounts)),p_resource:null,p_actor:'usr_super_admin',p_evidence:evidence}));
    }
    await this.renew(org);
    return this.subscription(org);
  }
  static async renew(org:string) {
    const agreements=await this.agreements(org),results=[];
    for(const agreement of agreements.filter(a=>a.active)){
      const period=billingPeriod(agreement.evidence.startsAt,agreement.kind);if(!period)continue;
      const invoice=await read(saasDatabase().from('billing_recurring_invoices').select('state').eq('agreement_id',agreement.id).eq('period_start',period.from).maybeSingle());
      if(invoice?.state==='paid')continue;
      if(agreement.kind==='phone_rental'){
        const prior=await invoiceHistory(org);
        if(missingRentalPeriod(agreement,prior)){results.push({state:'review_required'});continue;}
        const {zernioClient}=await import('@/lib/zernio/client');
        // A remote release must stop customer renewal even if it happened outside this dashboard.
        const organization=await read(saasDatabase().from('organizations').select('zernio_profile_id').eq('id',org).single());
        const profileId=organization?.zernio_profile_id;
        if(typeof profileId!=='string'||!profileId)throw new TenantAccessError(503,'Rental ownership is unavailable; no renewal was charged.');
        const listed=await zernioClient.request<{numbers?:Row[]}>({method:'GET',path:'/phone-numbers',query:{profileId}});
        if(!Array.isArray(listed.data.numbers))throw new TenantAccessError(503,'Rental inventory is unavailable; no renewal was charged.');
        let number=listed.data.numbers.find(n=>(n._id??n.id)===agreement.resource_id);
        if(!number){const released=await zernioClient.request<{numbers?:Row[]}>({method:'GET',path:'/phone-numbers',query:{profileId,status:'released'}});number=released.data.numbers?.find(n=>(n._id??n.id)===agreement.resource_id);}
        if(!number||(typeof number.profileId==='string'?number.profileId:number.profileId?._id)!==profileId)throw new TenantAccessError(503,'Rental ownership cannot be confirmed; review the supplier before charging.');
        if(number.status==='released'){
          await read(saasDatabase().rpc('billing_stop_agreement',{p_org:org,p_key:agreement.agreement_key,p_actor:'usr_super_admin',p_evidence:{numberId:agreement.resource_id,providerReference:agreement.resource_id,released:true}}));continue;
        }
        if(number.status!=='active'||number.monthlyCents!==agreement.evidence.providerMonthlyMinor)throw new TenantAccessError(503,'Rental state or supplier price changed. Administrator review is required before renewal.');
      }
      const evidence={agreementId:agreement.id,periodStart:period.from,periodEnd:period.to,termsVersion:agreement.evidence.termsVersion??PRICING.version};
      results.push(await read(saasDatabase().rpc('billing_charge_period',{p_org:org,p_agreement:agreement.id,p_period_start:period.from,p_period_end:period.to,p_evidence:evidence})));
    }
    return {paid:results.filter(r=>r.state==='paid'&&!r.replayed).length,paymentDue:results.filter(r=>r.state==='dunning').length,reviewRequired:results.filter(r=>r.state==='review_required').length};
  }
  static async cancelSubscription(org:string,actorId:string,confirmed:unknown) {
    if(confirmed!==true)throw new TenantAccessError(400,'Confirm that subscription renewal should stop after the paid period.');
    return read(saasDatabase().rpc('billing_stop_agreement',{p_org:org,p_key:'subscription',p_actor:'usr_super_admin',p_evidence:{requestedBy:actorId,stopFutureRenewals:true}}));
  }
  static async snapshot(org:string,role:TenantRole,tenants:Row[]=[]) {
    const db=saasDatabase();
    const [wallet,ledger,agreements,invoices,subscription]=await Promise.all([
      read(db.from('billing_wallets').select('*').eq('organization_id',org).maybeSingle()),
      read(db.from('billing_wallet_ledger').select('id,kind,amount_minor,external_reference,reservation_id,created_at').eq('organization_id',org).order('created_at',{ascending:false}).limit(100)),
      this.agreements(org),invoiceHistory(org),this.subscription(org)
    ]);
    return {organizationId:org,role,tenants,wallet:{availableMinor:wallet?.available_minor??0,heldMinor:wallet?.held_minor??0,spentMinor:wallet?.spent_minor??0,currency:'USD'},subscription,
      agreements:agreements.map(a=>{const period=billingPeriod(a.evidence.startsAt,a.kind),invoice=period?invoices.find((i:Row)=>i.agreement_id===a.id&&new Date(i.period_start).toISOString()===period.from):null;return {id:a.id,kind:a.kind,amountMinor:a.amount_minor,resourceId:a.resource_id,active:a.active,nextDueAt:invoice?.state==='paid'?period?.to:period?.from??a.evidence.startsAt,status:invoice?.state??'pending'};}),
      ledger:ledger.map((l:Row)=>({id:l.id,kind:l.kind,amountMinor:l.amount_minor,createdAt:l.created_at,reference:l.external_reference,reservationId:l.reservation_id})),
      pricing:PRICING,paymentsAvailable:false,rentalReviewRequired:agreements.some(a=>a.active&&a.kind==='phone_rental'&&missingRentalPeriod(a,invoices)),numberRenewalWarning:'Number rental continues at the supplier until release is confirmed. A wallet shortfall requires administrator action; it does not cancel the number.',supplierProfit:null};
  }
  static async drain() {
    // Each debit is idempotent in PostgreSQL; a failed workspace does not block later workspaces.
    let cursor='',processed=0,paymentDue=0,failed=0;
    while(true){
      const rows:Row[]=await read(saasDatabase().from('billing_recurring_agreements').select('id,organization_id').eq('active',true).gt('id',cursor||'00000000-0000-0000-0000-000000000000').order('id').limit(50));
      if(!rows.length)break;
      for(const org of new Set(rows.map(r=>r.organization_id))){try{const r=await this.renew(org);processed+=r.paid;paymentDue+=r.paymentDue;failed+=r.reviewRequired;}catch{failed++;}}
      cursor=rows.at(-1)!.id;if(rows.length<50)break;
    }
    return {processed,paymentDue,failed};
  }
}
