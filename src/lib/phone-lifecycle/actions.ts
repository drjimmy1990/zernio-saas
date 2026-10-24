import { PhoneNumbersLifecycle } from './numbers';
import { PhoneMessages } from './messages';
import { PhoneTemplates } from './templates';
import { PhoneCalls } from './calls';
import { PhoneCallSettings } from './call-settings';
import { WhatsAppFlowsLifecycle } from './flows';
import { WhatsAppService } from '@/lib/whatsapp/service';
import { TenantAccessError } from '@/lib/auth/tenant-access';
import { ZernioApiException } from '@/lib/zernio/client';
export const PHONE_READ_ACTIONS=['numbers','offers','availability','number','accounts','conversations','messages','call_history','call_estimate','call_permission','call_settings','templates','flows','flow','flow_preview','flow_responses'];
export async function runPhoneLifecycleAction(organizationId:string,action:string,input:Record<string,any>):Promise<Record<string,any>> {
 switch(action){
  case'purchase_quote':return PhoneNumbersLifecycle.quote(organizationId,input);case'sms_quote':return PhoneMessages.quoteSms(organizationId,input);case'call_quote':return PhoneCalls.quote(organizationId,input);
  case'call_settings':return PhoneCallSettings.read(organizationId,input);case'call_settings_save':return PhoneCallSettings.save(organizationId,input);case'call_permission_request':return PhoneCallSettings.requestPermission(organizationId,input);
  case'numbers':return PhoneNumbersLifecycle.list(organizationId);case'offers':return PhoneNumbersLifecycle.offers(organizationId,input.country,input.numberType,input.wantsSms,{areaCode:input.areaCode,locality:input.locality,contains:input.contains,limit:input.limit});case'availability':return PhoneNumbersLifecycle.availability(organizationId,input.country,input.numberType,input.wantsSms);case'number':return PhoneNumbersLifecycle.detail(organizationId,input.numberId);case'purchase':return PhoneNumbersLifecycle.purchase(organizationId,input);case'purchase_reconcile':return PhoneNumbersLifecycle.reconcile(organizationId,input.operationKey);case'release_reconcile':return PhoneNumbersLifecycle.reconcileRelease(organizationId,input.operationKey);case'release':return PhoneNumbersLifecycle.release(organizationId,input);
  case'accounts':return PhoneMessages.accounts(organizationId);case'conversations':return PhoneMessages.conversations(organizationId,input.accountId,input.cursor);case'messages':return PhoneMessages.messages(organizationId,input.accountId,input.conversationId,input.cursor);case'sms_send':return PhoneMessages.sendSms(organizationId,input);
  case'call_history':return PhoneCalls.history(organizationId,input);case'call_estimate':return PhoneCalls.estimate(organizationId,input);case'call_permission':return PhoneCalls.permission(organizationId,input.accountId,input.to);case'call_start':return PhoneCalls.start(organizationId,input);case'call_reconcile':return PhoneCalls.reconcile(organizationId,input.operationKey);
  case'templates':return WhatsAppService.listTemplates({organizationId,accountId:input.accountId});case'template_create':return WhatsAppService.createTemplate({organizationId,accountId:input.accountId,name:input.name,language:input.language,category:input.category,components:input.components,parameter_format:input.parameter_format,message_send_ttl_seconds:input.message_send_ttl_seconds});
  case'template_send':return PhoneTemplates.send(organizationId,input);
  case'flows':return WhatsAppFlowsLifecycle.list(organizationId,input.accountId);case'flow':return WhatsAppFlowsLifecycle.get(organizationId,input.accountId,input.flowId);case'flow_create':return WhatsAppFlowsLifecycle.create(organizationId,input);case'flow_upload':case'flow_publish':case'flow_delete':case'flow_deprecate':case'flow_preview':return WhatsAppFlowsLifecycle.change(organizationId,action,input);case'flow_responses':return WhatsAppFlowsLifecycle.responses(organizationId,input.accountId,input.flowId);case'flow_send':return WhatsAppFlowsLifecycle.send(organizationId,input);
  default:throw new TenantAccessError(501,'This phone capability is unavailable. Customer payments, AI agents, fake verification and endpoint-backed automation are Coming soon.');
 }
}
export function phoneLifecycleError(error:unknown) {const p=error instanceof ZernioApiException?error.envelope:undefined;return {status:error instanceof TenantAccessError?error.status:p?.status??503,payload:{success:false,error:{code:p?.code??'phone_operation_unavailable',message:error instanceof Error?error.message:'Phone service is unavailable.',details:p?.details}}};}
