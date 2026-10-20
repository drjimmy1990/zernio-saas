const http=require('http');const key='launch-saas:state';const seed=()=>({scenario:'success',reservations:{},requests:[]});
http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost'),body=req.body||{},send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};let state=await pm.state.get(key)||seed();
 if(url.pathname==='/__fixture/reset'){state={...seed(),scenario:body.scenario||'success'};await pm.state.set(key,state);return send(200,{ok:true});}
 if(url.pathname==='/__fixture/state')return send(200,state);
 state.requests.push({path:url.pathname,method:req.method,body});await pm.state.set(key,state);
 if(url.pathname==='/rest/v1/rpc/saas_reserve_allowance'){
  if(state.scenario==='allowance-outage')return send(503,{message:'Allowance database unavailable'});
  if(state.scenario==='disabled')return send(200,{error_code:'spending_disabled',status:403,message:'Administrator spending approval required.'});
  if(state.scenario==='insufficient')return send(200,{error_code:'insufficient_allowance',status:409,message:'Insufficient allocation.'});
  const previous=state.reservations[body.p_operation_key];if(previous){if(previous.fingerprint!==body.p_intent_fingerprint)return send(200,{error_code:'allowance_intent_conflict',status:409,message:'Changed send intent.'});return send(200,{...previous.result,replayed:true});}
  const result={reservationId:'22222222-2222-4222-8222-222222222222',state:'reserved',amountMinor:25,currency:'USD',replayed:false,quoteSource:body.p_quote_source};state.reservations[body.p_operation_key]={result,fingerprint:body.p_intent_fingerprint};await pm.state.set(key,state);return send(200,result);
 }
 if(url.pathname==='/api/v1/inbox/conversations/conversation-one')return send(200,{data:{id:'conversation-one',accountId:'owned-wa',platform:'whatsapp',participantId:'201234567890'}});
 if(['/api/v1/inbox/conversations','/api/v1/inbox/conversations/conversation-one/messages'].includes(url.pathname)&&req.method==='POST'){
  if(state.scenario==='permission')return send(403,{error:'Permission missing',code:'META_PERMISSION',platformError:{code:10}});
  if(state.scenario==='unknown')return send(502,{error:'Unknown upstream send result',code:'META_UNKNOWN',details:{outcome:'unknown'}});
  if(state.scenario==='rate-limit'){res.setHeader('Retry-After','0');return send(429,{error:'Throttled',code:'RATE_LIMIT'});}
  if(state.scenario==='malformed')return send(200,{});
  return send(201,{data:{messageId:'provider-message-one'},success:true});
 }
 return send(501,{error:'Fixture endpoint not defined.'});
}).listen(process.env.PORT);
