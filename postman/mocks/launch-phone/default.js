// Local SDK-shaped responses only. No purchases, SMS, calls or Meta writes occur.
const http=require('http'),key='launch-phone:state',PROFILE='profile-a',WA='wa-a',SMS='sms-a';
const number=(id='number-a')=>({_id:id,profileId:PROFILE,phoneNumber:id==='number-a'?'+14155550101':'+14155550102',country:'US',numberType:'local',status:'active',monthlyCents:300,provisionedAt:'2026-10-31T23:59:00.000Z',hostedByZernio:true,smsCapable:true,smsSendApproved:true,smsRegistrationPending:false,features:{calls:true,whatsapp:true},pstnVoiceEnabled:true,maxCallDurationSeconds:120,ownerAccountId:'phone-a'});
const seed=()=>({scenario:'success',requests:[],numbers:[number()],flows:[{id:'flow-a',name:'Contact',status:'DRAFT',categories:['CONTACT_US']}],calls:[]});
http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost'),body=req.body||{},send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','X-Request-Id':'launch-phone-provider'});res.end(JSON.stringify(data));};let s=await pm.state.get(key)||seed();
 if(url.pathname==='/__fixture/reset'){s={...seed(),scenario:body.scenario||'success'};if(s.scenario==='legacy-call')s.calls=[{_id:'call-a',accountId:WA,from:'+14155550101',to:'+14155550999',status:'ended',durationSeconds:12,billing:{billableCostUSD:0.02,currency:'USD'}}];await pm.state.set(key,s);return send(200,{ok:true});}
 if(url.pathname==='/__fixture/state')return send(200,s);
 if(url.pathname==='/__fixture/scenario'){s.scenario=body.scenario;await pm.state.set(key,s);return send(200,{ok:true});}
 const route=url.pathname.replace(/^\/api\/v1/,''),method=req.method;s.requests.push({path:route,method,query:Object.fromEntries(url.searchParams),body,idempotencyKey:req.headers['idempotency-key']});await pm.state.set(key,s);
 if(req.headers.authorization!=='Bearer launch_phone_mock_key')return send(401,{error:'Test credential required'});
 if(route==='/accounts')return send(200,{accounts:[{_id:WA,profileId:PROFILE,platform:'whatsapp',isActive:s.scenario!=='inactive',needsReconnection:false},{_id:SMS,profileId:PROFILE,platform:'sms',isActive:true},{_id:'other-wa',profileId:'profile-b',platform:'whatsapp',isActive:true}]});
 if(route==='/phone-numbers/countries')return send(200,{countries:[{code:s.scenario==='mobile-only'?'GB':'US',types:[{numberType:s.scenario==='mobile-only'?'mobile':'local',monthlyCents:s.scenario==='price-changed'?400:300,whatsappAvailable:true,smsAvailable:s.scenario!=='sms-unavailable',needsKyc:s.scenario==='kyc',...(['out-of-stock','stock-replenished'].includes(s.scenario)?{inStock:false,preOrderable:false}:{}),...(s.scenario==='request-preorder'?{fulfilment:'request',inStock:false,preOrderable:true}:{})}]}]});
 if(route==='/phone-numbers/available')return send(200,{country:s.scenario==='wrong-country'?'GB':url.searchParams.get('country'),numberType:s.scenario==='wrong-type'?'mobile':url.searchParams.get('numberType'),numbers:s.scenario==='out-of-stock'?[]:[{phoneNumber:'+14155550102',features:s.scenario==='sms-feature-mismatch'?['voice']:['voice','sms']}]});
 if(route==='/phone-numbers'&&method==='GET'){const nums=s.numbers.map(n=>({...n,...(s.scenario==='sms-unapproved'?{smsSendApproved:false}:{}),...(s.scenario==='no-duration'?{maxCallDurationSeconds:null}:{})}));return send(200,{numbers:[...nums.filter(n=>url.searchParams.get('status')==='released'?n.status==='released':n.status!=='released'),{...number('foreign-number'),profileId:'profile-b'}],connected:[]});}
 if(route==='/phone-numbers/purchase'){
  if(['kyc','request-preorder'].includes(s.scenario))return send(202,{status:'kyc_required',kycUrl:'https://provider.example.invalid/kyc'});
  if(s.scenario==='purchase-rejected')return send(403,{error:'Carrier permission denied',code:'CARRIER_PERMISSION'});
  const n=number('number-new');s.numbers.push(n);await pm.state.set(key,s);
  if(s.scenario==='purchase-unknown')return send(502,{error:'Allocation response unavailable',code:'UNKNOWN_OUTCOME'});
  return send(201,{phoneNumber:{id:n._id,profileId:s.scenario==='wrong-profile'?'profile-b':PROFILE,phoneNumber:n.phoneNumber,status:n.status}});
 }
 // Calling contracts: account-scoped resolution, number-scoped canonical config, partial writes.
 const calling=()=>({...{phoneNumber:'+14155550101',callingEnabled:true,forwardTo:'tel:+14155550888',maxCallDurationSeconds:120,outboundDisabled:false,recordingEnabled:true,callerIdMode:'business',callerIdVerified:true},...s.callConfig,...(s.scenario==='no-duration'?{maxCallDurationSeconds:null}:{}),...(s.scenario==='outbound-blocked'?{outboundDisabled:true}:{}),...(s.scenario==='settings-null'?{callingEnabled:null}:{})});
 if(route==='/whatsapp/calling')return send(200,{...calling(),phoneNumberDocId:'number-a'});
 if(route==='/phone-numbers/number-a/whatsapp/calling'){
  if(method==='GET')return send(200,calling());
  if(s.scenario==='settings-rejected')return send(422,{error:'Calling not eligible',code:'invalid_resource_state'});
  if(s.scenario!=='settings-mismatch')s.callConfig={...calling(),...body,callingEnabled:method!=='DELETE'};
  await pm.state.set(key,s);
  if(s.scenario==='settings-unknown')return send(502,{error:'Save response unknown'});
  return send(200,method==='PATCH'?{success:true}:{success:true,callingEnabled:method!=='DELETE',forwardTo:body.forwardTo});
 }
 if(route==='/phone-numbers/number-a/voice'){
  const n=s.numbers.find(n=>n._id==='number-a');
  if(s.scenario!=='settings-mismatch'){n.pstnVoiceEnabled=method!=='DELETE';if(body.forwardTo!==undefined)n.pstnForwardTo=body.forwardTo;}
  await pm.state.set(key,s);
  if(s.scenario==='settings-unknown')return send(502,{error:'Save response unknown'});
  return send(200,{enabled:method!=='DELETE',phoneNumber:n.phoneNumber,pstnForwardTo:n.pstnForwardTo});
 }
 if(route==='/whatsapp/call-permissions')return send(200,{permission:{status:'no_permission'},actions:[{action_name:'start_call',can_perform_action:!['no-call-permission','permission-required','permission-unknown','permission-denied'].includes(s.scenario)},{action_name:'send_call_permission_request',can_perform_action:!s.permissionRequested&&s.scenario!=='permission-denied'}]});
 if(route==='/whatsapp/calls'&&method==='POST'&&body.action==='send_call_permission_request'){
  s.permissionRequested=true;await pm.state.set(key,s);
  if(s.scenario==='permission-unknown')return send(502,{error:'Prompt acceptance unknown'});
  // The reference does not specify a prompt-specific payload; only acknowledge the HTTP request.
  return send(200,{success:true});
 }
 if(route.startsWith('/phone-numbers/')){const id=route.split('/')[2],n=s.numbers.find(n=>n._id===id);if(!n)return send(404,{error:'Number not found'});if(method==='DELETE'){if(s.scenario==='release-unconfirmed')return send(200,{phoneNumber:{id,status:'released'}});n.status='released';await pm.state.set(key,s);return send(200,{phoneNumber:{id,status:'released',releasedAt:new Date().toISOString()}});}return send(200,{phoneNumber:{...n,id:n._id,...(s.scenario==='sms-unapproved'?{smsSendApproved:false}:{}),...(s.scenario==='no-duration'?{maxCallDurationSeconds:null}:{})}});}
 if(route==='/sms/opt-outs')return send(200,{optOuts:s.scenario==='opt-out'?[{phoneNumber:'+14155550999',from:'+14155550101',optedOutAt:new Date().toISOString()}]:[],count:s.scenario==='opt-out-incomplete'?1001:s.scenario==='opt-out'?1:0});
 if(route==='/sms/messages'){if(s.scenario==='sms-unknown')return send(502,{error:'Receipt unknown'});if(s.scenario==='sms-rejected')return send(422,{error:'Rejected before acceptance'});return send(200,{id:'sms-message-a',conversationId:'conversation-a',status:'sent'});}
 if(route==='/whatsapp/templates')return send(200,{templates:[{id:'template-a',name:'order_update',language:'en_US',status:'APPROVED',category:s.scenario==='marketing-template'?'MARKETING':'UTILITY',components:[{type:'HEADER',format:'IMAGE'},{type:'BODY',text:'Hello {{1}}'}]}]});
 if(route==='/inbox/conversations'&&method==='POST'&&s.scenario==='template-unknown')return send(502,{error:'Template acceptance unknown'});
 if(route==='/inbox/conversations'&&method==='POST')return send(200,{success:true,data:{messageId:'template-message-a'}});
 if(route==='/inbox/conversations')return send(200,{data:[{id:'conversation-a',accountId:SMS,platform:'sms',participantId:'+14155550999',lastMessage:'Delivered message'}],pagination:{hasMore:false}});
 if(route==='/inbox/conversations/wa-conversation-a')return send(200,{data:{id:'wa-conversation-a',accountId:WA,platform:'whatsapp',participantId:s.scenario==='invalid-participant'?'not-a-phone':'14155550999'}});
 if(route==='/inbox/conversations/conversation-a')return send(200,{data:{id:'conversation-a',accountId:s.scenario==='foreign-conversation'?'other-sms':SMS,platform:'sms'}});
 if(route==='/inbox/conversations/conversation-a/messages')return send(200,{messages:[{id:'sms-message-a',text:'Receipt',deliveryStatus:'delivered',direction:'outbound'}]});
 if(route.endsWith('/calls/estimate'))return send(200,{breakdown:{billableCostUSD:0.12,totalCostUSD:0.18}});
 if((route==='/voice/calls'||route==='/whatsapp/calls')&&method==='POST'){const call={_id:'call-a',accountId:WA,from:body.fromNumber||'+14155550101',to:body.to,status:'ended',durationSeconds:12,billing:{billableCostUSD:0.02,currency:'USD'}};s.calls.push(call);await pm.state.set(key,s);return send(200,{success:true,callId:call._id,status:'dialing'});}
 if((route==='/voice/calls'||route==='/whatsapp/calls')&&method==='GET')return send(200,{calls:s.calls});
 if(route==='/voice/calls/call-a'||route==='/whatsapp/calls/call-a')return send(200,{call:s.calls[0]});
 if(route==='/whatsapp/flows'&&method==='GET')return send(200,{success:true,flows:s.flows});
 if(route==='/whatsapp/flows'&&method==='POST'){const f={id:'flow-new',name:body.name,categories:body.categories,status:'DRAFT'};s.flows.push(f);await pm.state.set(key,s);return send(201,{success:true,flow:f});}
 if(route==='/whatsapp/flows/send'){if(s.scenario==='flow-send-unknown')return send(502,{error:'Message acceptance unknown'});return send(200,{success:true,messageId:'flow-message-a'});}
 if(route==='/whatsapp/flow-responses')return send(200,{success:true,responses:[{id:'response-a',flowId:'flow-a',response:{choice:'Support'}}]});
 if(route.startsWith('/whatsapp/flows/')){const id=route.split('/')[3],f=s.flows.find(f=>f.id===id);if(!f)return send(404,{error:'Form not found'});if(route.endsWith('/preview'))return send(200,{preview_url:'https://provider.example.invalid/preview',expires_at:'2099-01-01T00:00:00Z'});if(route.endsWith('/json'))return send(200,{success:true,validation_errors:s.scenario==='invalid-flow'?[{error:'Missing terminal screen'}]:[]});if(route.endsWith('/publish'))f.status='PUBLISHED';else if(route.endsWith('/deprecate'))f.status='DEPRECATED';else if(method==='DELETE')s.flows=s.flows.filter(f=>f.id!==id);else return send(200,{success:true,flow:f});await pm.state.set(key,s);return send(200,{success:true});}
 return send(501,{error:'Fixture endpoint not defined'});
}).listen(process.env.PORT);
