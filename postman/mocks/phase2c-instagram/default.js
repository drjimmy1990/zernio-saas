// Installed SDK: Posts, ValidatePost, ValidateMedia, SocialAccount.metadata.loginMethod,
// InstagramPlatformData and GetInstagramPublishingLimit. Local only; no real credentials.
const http = require('http');
const PROFILE='66a1f0c2a4b9d3e8f1a2b3c4', IG='66b1f0c2a4b9d3e8f1a2b3c5', FB='66b1f0c2a4b9d3e8f1a2b3c4', OTHER='77b1f0c2a4b9d3e8f1a2b3c4', key='phase2c-instagram:state';
const seed=()=>({scenario:'success',requests:[],posts:[],intents:{}});
http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost'),body=req.body||{},send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','X-Request-Id':'phase2c-provider-request'});res.end(JSON.stringify(data));};let state=await pm.state.get(key)||seed();
 if(url.pathname==='/__fixture/reset'){state={...seed(),scenario:body.scenario||'success'};await pm.state.set(key,state);return send(200,{ok:true});}
 if(url.pathname==='/__fixture/state')return send(200,state);
 if(url.pathname==='/__fixture/scenario'){state.scenario=body.scenario;await pm.state.set(key,state);return send(200,{ok:true});}
 if(url.pathname==='/__fixture/seed'){state.posts.push(body.post);await pm.state.set(key,state);return send(200,{ok:true});}
 const route=url.pathname.replace(/^\/api\/v1/,''),intent=req.headers['idempotency-key'];state.requests.push({method:req.method,path:route,query:Object.fromEntries(url.searchParams),body,idempotencyKey:intent});await pm.state.set(key,state);
 if(req.headers.authorization!=='Bearer phase2c_mock_key')return send(401,{error:'Test credential required'});
 if(route.startsWith('/profiles/'))return send(200,{profile:{_id:route.split('/')[2],externalId:route.endsWith(PROFILE)?'tenant-a':'tenant-b'}});
 const accounts=[{_id:IG,profileId:PROFILE,platform:'instagram',isActive:state.scenario!=='inactive',enabled:state.scenario!=='disabled',metadata:state.scenario==='direct-login'?{}:{loginMethod:'facebook_login'},platformUserId:'17841-test'},{_id:FB,profileId:PROFILE,platform:'facebook',isActive:state.scenario!=='published-disconnected',enabled:true},{_id:OTHER,profileId:'other-profile',platform:'instagram',isActive:true}];
 if(route==='/accounts')return send(200,{accounts});
 if(route==='/accounts/health')return send(200,{accounts:accounts.filter(a=>a.profileId===url.searchParams.get('profileId')).map(a=>({...a,status:'healthy'})),summary:{total:2,healthy:2,error:0}});
 if(route.endsWith('/instagram/publishing-limit')){if(state.scenario==='quota-malformed')return send(200,{quotaUsage:1});if(state.scenario==='quota-unavailable')return send(503,{error:'Quota unavailable',code:'QUOTA_UNAVAILABLE'});return send(200,{quotaUsage:state.scenario==='quota-full'?7:1,quotaTotal:7,quotaDurationSeconds:86400});}
 if(route==='/tools/validate/post'){if(state.scenario==='post-malformed')return send(200,{});return send(200,{valid:state.scenario!=='post-invalid',...(state.scenario==='post-invalid'?{errors:[{platform:'instagram',error:'Instagram hashtag limit exceeded'}]}:{}),warnings:[{platform:'instagram',warning:'Near caption limit'}]});}
 if(route==='/tools/validate/media'){if(state.scenario==='media-unavailable')return send(503,{error:'Media preflight unavailable',code:'MEDIA_UNAVAILABLE'});if(state.scenario==='media-malformed')return send(200,{valid:true});const video=/\.(mp4|mov)(?:\?|$)/i.test(body.url),html=state.scenario==='media-html',wrong=state.scenario==='media-wrong-type';return send(200,{valid:state.scenario!=='media-invalid',url:body.url,...(state.scenario==='media-invalid'?{error:'URL is not publicly accessible'}:{}),contentType:html?'text/html':video?'video/mp4':'image/jpeg',size:1024,type:wrong?'unknown':video?'video':'image',platformLimits:{instagram:{limit:video?300000000:8000000,withinLimit:true}}});}
 if(route==='/queue/slots')return send(200,{queues:[]});
 const postId=route.split('/')[2],existing=state.posts.find(p=>p._id===postId);
 if(route==='/posts'&&req.method==='GET')return send(200,{posts:state.posts,pagination:{page:1,limit:50,total:state.posts.length,pages:1}});
 if(req.method==='GET'&&existing)return send(200,{post:existing});
 if(route.startsWith('/posts/')&&!existing)return send(404,{error:'Post not found'});
 if(state.scenario==='permission-denied')return send(403,{error:'Instagram publishing permission missing',code:'META_PERMISSION',platform:'instagram',platformError:{code:10},details:{required:'instagram_content_publish'}});
 if(state.scenario==='rate-limit'){res.setHeader('Retry-After','30');return send(429,{error:'Provider throttled',code:'RATE_LIMIT'});}
 if(state.scenario==='publish-unknown')return send(502,{error:'Instagram did not confirm publication',code:'META_UNKNOWN',details:{outcome:'unknown'},platformError:{code:2}});
 if(route==='/posts'&&intent&&state.intents[intent])return send(200,state.intents[intent]);
 if(['POST','PUT'].includes(req.method)){
  let post=existing?{...existing,...body}:{...body,_id:(state.posts.length+1).toString(16).padStart(24,'0')};
  if(req.method==='PUT'&&body.platforms)post.platforms=body.platforms.map(t=>{const old=existing.platforms.find(p=>p.accountId===t.accountId&&p.platform===t.platform)||{},settings={...(t.platformSpecificData||{})};for(const[k,v]of Object.entries(old.platformSpecificData||{}))if(k.endsWith('Settings')&&!Object.hasOwn(settings,k))settings[k]=v;return{...old,...t,platformSpecificData:t.platformSpecificData===undefined?old.platformSpecificData:settings};});
  const retry=route.endsWith('/retry'),publish=body.publishNow||retry;post.platforms=post.platforms.map(t=>({...t,status:publish?(retry&&t.status!=='failed'?t.status:state.scenario==='partial'?t.platform==='facebook'?'published':'failed':state.scenario==='processing'?'processing':'published'):'pending',...(publish&&state.scenario!=='partial'&&state.scenario!=='processing'?{platformPostUrl:t.platform==='instagram'?'https://www.instagram.com/p/provider-test/':'https://www.facebook.com/page/posts/provider-test'}:{})}));
  post.status=state.scenario==='partial'?'partial':state.scenario==='processing'?'publishing':publish?'published':body.scheduledFor?'scheduled':'draft';
  if(existing)state.posts[state.posts.findIndex(p=>p._id===post._id)]=post;else state.posts.push(post);
  const result={post,message:'Provider accepted',warnings:['Canonical warning'],...(state.scenario==='partial'?{error:'Some publishing targets failed',platformResults:post.platforms.map(t=>({platform:t.platform,status:t.status,error:t.status==='failed'?'Instagram rejected media':null}))}:{})};if(route==='/posts')state.intents[intent]=result;await pm.state.set(key,state);return send(state.scenario==='partial'?207:201,result);
 }
 send(501,{error:'Fixture endpoint not defined'});
}).listen(process.env.PORT);
