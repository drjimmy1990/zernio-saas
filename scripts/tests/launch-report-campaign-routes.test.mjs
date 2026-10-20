import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
function runtime(file,role='editor') {
  const calls=[];
  class Access extends Error {constructor(status,message){super(message);this.status=status;}}
  class ProviderError extends Error {constructor(message){super(message);this.envelope={status:502};}}
  const report={source:'zernio',platform:'facebook',dataAsOf:null,fetchedAt:'2026-10-20T00:00:00Z',note:'Provider calendar',totals:{likes:0,reach:null},previousTotals:{likes:null,reach:1},followers:{current:4},daily:[{date:'2026-10-01',likes:0}],dateRange:{previousFromDate:'2026-09-30',previousToDate:'2026-09-30',timezone:'UTC'}};
  const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const service=new Proxy({},{get:(_,method)=>async(...args)=>{calls.push({method,args});return method==='social'||method==='messaging'?report:{id:args[1]};}});
  const require=name=>{
    if(name==='next/server')return{NextResponse:{json:Response.json}};
    if(name==='@/lib/auth/tenant-access')return{TenantAccessError:Access,requireTenantAccess:async(req,org)=>{if(role==='anonymous')throw new Access(401,'Sign in');if(org&&org!=='org-a')throw new Access(403,'Foreign workspace');if(req.headers.get('origin')==='https://other.invalid')throw new Access(403,'Wrong origin');return{role,session:{user:{id:'actor-a'},tenant:{organizationId:'org-a'}}};},requireWorkspaceRole:(value,editor)=>{if(![...['owner','admin'],...(editor?['editor']:[])].includes(value))throw new Access(403,'Role denied');}};
    if(name==='@/lib/campaigns/service')return{CampaignService:service};
    if(name==='@/lib/campaigns/store')return{CampaignStore:{list:async(...args)=>{calls.push({method:'list',args});return[];}}};
    if(name==='@/lib/zernio/client')return{ZernioApiException:ProviderError};
    if(name==='@/lib/reports/service')return{ReportsService:service,reportCsv:rows=>rows.map(row=>row.map(value=>value==null?'Unavailable':String(value)).join(',')).join('\n')};
    throw new Error(name);
  };
  const module={exports:{}};vm.runInNewContext(`(function(require,module,exports){${source}\n})`,{URL,Response,Request})(require,module,module.exports);
  return{...module.exports,calls};
}
const campaign='44444444-4444-4444-8444-444444444444';
test('campaign writes reject viewer, foreign workspace, stale confirmation and invalid identifiers before dispatch',async()=>{
  const body={action:'send',id:campaign,revision:1,confirmSend:true};
  for(const [role,input,expected]of [['viewer',body,403],['editor',{...body,organizationId:'org-b'},403],['editor',{...body,confirmSend:false},400],['editor',{...body,id:'bad'},400]]){
    const app=runtime('src/app/api/campaigns/route.ts',role);const response=await app.POST(new Request('https://asra3.com/api/campaigns',{method:'POST',body:JSON.stringify(input)}));assert.equal(response.status,expected);assert.equal(app.calls.length,0);
  }
  const app=runtime('src/app/api/campaigns/route.ts');const response=await app.POST(new Request('https://asra3.com/api/campaigns',{method:'POST',body:JSON.stringify(body)}));assert.equal(response.status,200);assert.deepEqual(app.calls.map(c=>c.method),['dispatch']);assert.equal(app.calls[0].args[0],'org-a');
});
test('campaign pages expose current role and reject invalid page filters',async()=>{
  const app=runtime('src/app/api/campaigns/route.ts','viewer');const response=await app.GET(new Request('https://asra3.com/api/campaigns'));assert.equal((await response.json()).role,'viewer');assert.equal(response.headers.get('cache-control'),'no-store');assert.equal((await app.GET(new Request('https://asra3.com/api/campaigns?skip=-1'))).status,400);
});
test('report CSV is role-protected and carries genuine zero/missing values, daily rows and period metadata',async()=>{
  const url='https://asra3.com/api/reports?kind=social&fromDate=2026-10-01&toDate=2026-10-01&format=csv';
  const viewer=runtime('src/app/api/reports/route.ts','viewer');assert.equal((await viewer.GET(new Request(url))).status,403);assert.equal(viewer.calls.length,0);
  const editor=runtime('src/app/api/reports/route.ts');const response=await editor.GET(new Request(url)),csv=await response.text();assert.equal(response.status,200);assert.match(csv,/likes,0,Unavailable/);assert.match(csv,/daily data,Provider rows/);assert.match(csv,/2026-10-01,0/);assert.match(csv,/previousFrom,2026-09-30/);assert.equal(response.headers.get('cache-control'),'no-store');
});
