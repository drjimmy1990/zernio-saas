// Contract source: installed @zernio/node broadcasts and WhatsApp templates.
const http = require('http');
const key = 'launch-campaigns:state';
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
  let state = await pm.state.get(key) || { scenario: 'success', requests: [], broadcast: null, phones: [] };
  if (url.pathname === '/__fixture/reset') { state = { scenario: req.body?.scenario || 'success', requests: [], broadcast: null, phones: [] }; await pm.state.set(key, state); return send(200, { ok: true }); }
  if (url.pathname === '/__fixture/state') return send(200, state);
  if (url.pathname === '/__fixture/status') { state.broadcast.status = req.body.status; await pm.state.set(key, state); return send(200, {ok:true}); }
  const path = url.pathname.replace(/^\/api\/v1/, ''); state.requests.push({ path, method: req.method, query: Object.fromEntries(url.searchParams), body: req.body });
  await pm.state.set(key, state);
  if (req.headers.authorization !== 'Bearer launch_campaigns_mock_key') return send(401, {error:'Fixture key required'});
  if (path === '/accounts') return send(200, { accounts: [{ _id:'owned',profileId:'profile-a',platform:'whatsapp',isActive:true }, { _id:'foreign',profileId:'profile-b',platform:'whatsapp',isActive:true }] });
  if (path === '/whatsapp/templates') return send(200, { templates:[{name:'launch_offer',language:'en_US',status:state.scenario==='unapproved'?'PENDING':'APPROVED'}] });
  if (path === '/broadcasts' && req.method === 'POST') {
    state.broadcast = {...req.body,id:'broadcast-a',status:'draft',recipientCount:0}; await pm.state.set(key,state);
    if (state.scenario==='unknown-create') return send(502,{error:'Provider response lost'});
    return send(200,{success:true,broadcast:state.broadcast});
  }
  if (!state.broadcast) return send(404,{error:'Broadcast not found'});
  if (path==='/broadcasts/broadcast-a' && req.method==='GET') return send(200,{success:true,broadcast:state.broadcast});
  if (path==='/broadcasts/broadcast-a' && req.method==='DELETE') { state.broadcast=null;await pm.state.set(key,state);return send(200,{success:true}); }
  if (path==='/broadcasts/broadcast-a/recipients' && req.method==='POST') {
    state.phones=req.body.phones;state.broadcast.recipientCount=state.phones.length;
    if(state.scenario==='changed-template') state.broadcast.template={name:'other_template',language:'en_US'};
    await pm.state.set(key,state);return send(200,{success:true,added:state.phones.length,skipped:0});
  }
  if(path==='/broadcasts/broadcast-a/recipients') {
    let phones=state.scenario==='changed-audience'?[...state.phones,'201000000099']:state.phones;
    const skip=Number(url.searchParams.get('skip')||0);
    return send(200,{success:true,recipients:phones.slice(skip,skip+100).map((phone,i)=>({id:`recipient-${skip+i}`,platformIdentifier:phone,status:state.broadcast.status==='completed'?'delivered':'pending'})),pagination:{hasMore:skip+100<phones.length,total:phones.length},summary:{total:phones.length}});
  }
  if(path==='/broadcasts/broadcast-a/send') {
    if(state.scenario==='rate-limit') return send(429,{error:'Request outcome unavailable'});
    state.broadcast.status='sending';await pm.state.set(key,state);return send(200,{success:true,status:'sending',sent:1,failed:0,recipientCount:state.phones.length});
  }
  if(path==='/broadcasts/broadcast-a/cancel') {state.broadcast.status='cancelled';await pm.state.set(key,state);return send(200,{success:true,broadcast:{id:'broadcast-a',status:'cancelled'}});}
  return send(501,{error:'Fixture endpoint not defined'});
}).listen(process.env.PORT);
