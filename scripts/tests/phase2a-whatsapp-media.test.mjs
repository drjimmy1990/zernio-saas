import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import http from 'node:http';
import test from 'node:test';
import ts from 'typescript';
const source=ts.transpileModule(fs.readFileSync('src/lib/whatsapp/media.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function runtime(base,scenario='success') {
 const calls=[]; class ZernioApiException extends Error {constructor(envelope){super(envelope.error);this.envelope=envelope;}}
 const exports={}; const modules={
  '@/lib/whatsapp/service':{WhatsAppService:{getConversation:async params=>{calls.push(params);if(scenario==='foreign')throw new ZernioApiException({status:403,error:'foreign'});}}},
  '@/lib/zernio/client':{ZernioApiException,zernioClient:{getBaseUrl:()=>base,getMasterApiKey:()=> 'isolated-media-key',isConfigured:()=>true,request:async options=>{calls.push(options);return{data:{url:scenario==='malicious'?'https://evil.example/media/id':`${base}/whatsapp/media/id-1`},status:200};}}},
 };
 vm.runInNewContext(`(function(require,exports){${source}\n})`,{URL,AbortController,setTimeout,clearTimeout,Uint8Array,fetch})(name=>modules[name],exports);
 return{download:exports.downloadWhatsAppMedia,calls};
}
const params={organizationId:'tenant-a',accountId:'account-a',conversationId:'thread-a',messageId:'old-message-99',attachmentIndex:0};
test('downloads authenticated binary from configured origin and resolves older exact message',async()=>{
 const server=http.createServer((req,res)=>{assert.equal(req.headers.authorization,'Bearer isolated-media-key');assert.equal(req.url,'/api/v1/whatsapp/media/id-1?accountId=account-a');res.writeHead(200,{'Content-Type':'image/png'});res.end(Buffer.from([1,2,3]));}); await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const s=runtime(`http://127.0.0.1:${server.address().port}/api/v1`),result=await s.download(params);assert.equal(result.contentType,'image/png');assert.deepEqual([...result.bytes],[1,2,3]);assert.ok(s.calls[1].path.includes('/old-message-99/attachments/0'));assert.equal(s.calls[1].query.format,'json');}finally{server.close();}
});
test('foreign message ownership and malicious canonical URL never receive provider credential',async()=>{
 for(const [scenario,status]of[['foreign',403],['malicious',400]]){const s=runtime('http://127.0.0.1:1/api/v1',scenario);await assert.rejects(s.download(params),e=>e.envelope?.status===status);}
});
test('binary 401/404/expired and unsupported/oversize/redirect responses remain explicit errors',async()=>{
 for(const [status,type,length,expected]of[[401,'image/png',0,401],[404,'image/png',0,404],[400,'application/json',0,400],[200,'text/html',0,415],[200,'image/png',26214401,413],[302,'image/png',0,502]]){
 const server=http.createServer((req,res)=>{res.writeHead(status,{'Content-Type':type,...(length?{'Content-Length':String(length)}:{}),...(status===302?{Location:'https://evil.example/leak'}:{})});res.end('x');});await new Promise(r=>server.listen(0,'127.0.0.1',r));try{await assert.rejects(runtime(`http://127.0.0.1:${server.address().port}/api/v1`).download(params),e=>e.envelope?.status===expected);}finally{server.close();}
 }
});
test('Office business documents receive safe download filename and attachment disposition',async()=>{
 const mime='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
 const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':mime});res.end(Buffer.from([80,75,3,4]));});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const result=await runtime(`http://127.0.0.1:${server.address().port}/api/v1`).download(params);assert.equal(result.contentType,mime);assert.equal(result.filename,'whatsapp-media.docx');assert.equal(result.disposition,'attachment');}finally{server.close();}
 const routeSource=fs.readFileSync('src/app/api/whatsapp/media/route.ts','utf8');assert.ok(routeSource.includes('result.disposition'));assert.ok(routeSource.includes('result.filename'));assert.ok(routeSource.includes('nosniff'));
});
