import { WhatsAppService } from '@/lib/whatsapp/service';
import { assertDestinationConsent } from '@/lib/crm/consent';
import { account, phone, profile, invalid, https, malformed } from './provider';
import { acquire, dispatch } from './paid';
import { TenantAccessError } from '@/lib/auth/tenant-access';

/** The canonical WhatsApp sender owns allowance enforcement; this journal prevents UI redispatch. */
export class PhoneTemplates {
 static async send(organizationId:string,input:Record<string,any>) {
  const a=await account(organizationId,input.accountId,['whatsapp'],true);phone(input.recipient);
  if(input.consentReviewed!==true)invalid('Review destination consent and the approved template before sending.');
  const list=await WhatsAppService.listTemplates({organizationId,accountId:input.accountId});
  const template=input.template,approved=(list.templates as any[]).find(t=>t.name===template?.name&&t.language===template?.language&&t.status==='APPROVED');
  if(!approved)throw new TenantAccessError(409,'The selected template is not currently approved. Refresh templates.');
  if(approved.category==='AUTHENTICATION')throw new TenantAccessError(501,'Authentication template delivery requires an actual verification service and is unavailable here.');
  if(template.components)invalid('Use explicit body parameters and header media for this new-recipient send.');
  const header=approved.components?.find((c:any)=>c.type==='HEADER'),format=header?.format?.toLowerCase();
  if(format&&format!=='text'){if(template.headerMedia?.type!==format||!template.headerMedia.link)invalid('This approved template requires matching public header media.');https(template.headerMedia.link);}
  else if(template.headerMedia)invalid('This template does not have a media header.');
  await assertDestinationConsent({organizationId,channel:'whatsapp',phone:input.recipient,purpose:approved.category==='MARKETING'?'marketing':'transactional'});
  const body={accountId:input.accountId,recipient:input.recipient,template};
  const opened=await acquire(organizationId,profile(a.profileId),'template_send',input.intent,body);if(opened.result)return opened.result;
  return dispatch(opened.operation,()=>WhatsAppService.sendMessage({organizationId,...body,idempotencyKey:input.intent}),r=>{if(typeof r.data?.messageId!=='string')malformed();return r.data.messageId;});
 }
}
