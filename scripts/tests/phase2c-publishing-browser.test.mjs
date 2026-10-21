import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import test, { before, after } from 'node:test';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';

let server, browser, origin;
const screenshots = path.resolve('docs/reviews/screenshots');
before(async () => {
  const entry = `import React from 'react';import {createRoot} from 'react-dom/client';import {ProviderPublishingWorkspace} from '${path.resolve('src/components/dashboard/ProviderPublishingWorkspace.tsx').replaceAll('\\','/')}';const rtl=location.search.includes('rtl');document.documentElement.lang=rtl?'ar':'en';createRoot(document.getElementById('root')).render(<ProviderPublishingWorkspace isRTL={rtl}/>);`;
  const bundle = await build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"production"'}});
  const css = (await postcss([tailwind()]).process(fs.readFileSync('src/app/globals.css','utf8'),{from:path.resolve('src/app/globals.css')})).css;
  server = http.createServer((req,res) => {
    res.setHeader('Content-Type',req.url==='/app.js'?'application/javascript':req.url==='/app.css'?'text/css':'text/html');
    res.end(req.url==='/app.js'?bundle.outputFiles[0].contents:req.url==='/app.css'?css:'<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"></head><body><main style="padding:24px;max-width:1160px;margin:auto" id="root"></main><script src="/app.js"></script></body></html>');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  origin=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({channel:'chrome',headless:true});fs.mkdirSync(screenshots,{recursive:true});
});
after(async()=>{await browser?.close();await new Promise(resolve=>server.close(resolve));});

async function fixture() {
  const context=await browser.newContext({viewport:{width:1280,height:1000}}), page=await context.newPage(), writes=[], reads=[];
  const state={profile:'owned-profile',quotaUsage:4,quotaTotal:50,quotaDelay:0,validationDelay:0,invalid:false,unknown:false,status:200,mediaUnknown:false,posts:[],writeFailure:0,postDelay:0,pages:1,accountsFailure:false};
  const accounts=[{_id:'fb',platform:'facebook',displayName:'Asra3 Store Page',isActive:true},
    {_id:'ig',platform:'instagram',displayName:'Asra3 Store',isActive:true,metadata:{loginMethod:'instagram_login'}},
    {_id:'ig-other',platform:'instagram',displayName:'Second Store',isActive:true,metadata:{loginMethod:'facebook_login'}},
    {_id:'ig-disabled',platform:'instagram',displayName:'Disabled Store',isActive:true,enabled:false},
    {_id:'ig-reconnect',platform:'instagram',displayName:'Reconnect Store',isActive:true,needsReconnection:true}];
  await context.route('**/*',async route=>{
    const request=route.request(), url=new URL(request.url());
    if (url.hostname==='media.example') return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420"><rect width="600" height="420" fill="#efe6d9"/><path d="M90 340h420V165H90z" fill="#123e32"/><path d="M65 165h470l-55-70H120z" fill="#c08353"/><text x="300" y="250" text-anchor="middle" fill="#f4eedf" font-family="serif" font-size="52">Asra3 Store</text><text x="300" y="300" text-anchor="middle" fill="#f4eedf" font-size="20">Fresh arrivals this week</text></svg>'});
    if (url.hostname==='upload.example') return route.fulfill({status:200,body:''});
    assert.equal(url.origin,origin,'All browser traffic must use fixtures; no provider live calls.');
    if(url.pathname!=='/api/publishing') return route.continue();
    if(request.method()==='GET') {
      const action=url.searchParams.get('action'),accountId=url.searchParams.get('accountId');reads.push({action,accountId});
      if(action==='accounts')return route.fulfill(state.accountsFailure?{status:502,json:{error:{message:'Account verification unavailable'}}}:{json:{profileId:state.profile,accounts}});
      if(action==='instagram_limit') {
        const result={quotaUsage:accountId==='ig-other'?1:state.quotaUsage,quotaTotal:accountId==='ig-other'?25:state.quotaTotal,quotaDurationSeconds:86400,httpStatus:200};
        if(accountId==='ig'&&state.quotaDelay)await new Promise(resolve=>setTimeout(resolve,state.quotaDelay));
        return route.fulfill({json:result});
      }
      if(action==='post') { const result={post:state.posts.find(post=>post._id===url.searchParams.get('postId')),httpStatus:200};if(state.postDelay)await new Promise(resolve=>setTimeout(resolve,state.postDelay));return route.fulfill({json:result}); }
      return route.fulfill({json:{posts:state.posts,pagination:{pages:state.pages}}});
    }
    const body=request.postDataJSON();writes.push(body);
    if(body.action==='validate_post') {
      const result={valid:!state.invalid,errors:state.invalid?[{message:'The video is not accessible. Replace its media URL.'}]:[],warnings:[],httpStatus:200};
      if(state.validationDelay)await new Promise(resolve=>setTimeout(resolve,state.validationDelay));
      return route.fulfill({json:result});
    }
    if(body.action==='validate_media')return route.fulfill({json:{valid:!state.invalid,url:body.url,type:body.url.includes('.mp4')?'video':'image',contentType:body.url.includes('.mp4')?'video/mp4':'image/jpeg',size:state.mediaUnknown?null:10240,platformLimits:{instagram:{withinLimit:true}},error:state.invalid?'Media URL unavailable':undefined,httpStatus:200}});
    if(body.action==='presign')return route.fulfill({json:{provider:'zernio-presign',uploadUrl:'https://upload.example/file',publicUrl:'https://media.example/upload.jpg',uploadMethod:'PUT'}});
    if(state.writeFailure)return route.fulfill({status:state.writeFailure,json:{error:{message:state.writeFailure===409?'Account publishing disabled':'Publishing policy changed'}}});
    if(state.unknown)return route.abort('failed');
    const post={_id:'persisted-post',content:body.content,status:state.status===207?'partial':body.isDraft?'draft':body.scheduledFor?'scheduled':'published',mediaItems:body.mediaItems,platforms:(body.platforms||[{platform:'instagram',accountId:'ig'}]).map(target=>({...target,status:state.status===207?'failed':body.publishNow?'published':'pending',errorMessage:state.status===207?'Instagram rejected the media':undefined}))};
    return route.fulfill({status:state.status,json:{post,httpStatus:state.status,...(state.status===207?{error:'Inline publish aborted',warnings:['Comments toggle may remain on'],platformResults:[{platform:'instagram',status:'failed',error:'Specific Meta failure'}]}:{})}});
  });
  await page.goto(origin);await page.getByLabel('Publishing account').selectOption('ig');
  return {context,page,state,writes,reads};
}
async function addMedia(page,url='https://media.example/shop.jpg',type='image',rtl=false) {
  await page.locator('details').evaluate(node=>node.open=true);
  await page.getByLabel('Media type',{exact:true}).selectOption(type);await page.getByLabel('Media URL',{exact:true}).fill(url);
  await page.getByRole('button',{name:rtl?'إضافة':'Add',exact:true}).click();
}
const mutations=writes=>writes.filter(body=>['create','update','retry'].includes(body.action));

test('Instagram requires media, checks provider errors and real quota, then reviews and preserves a 207 persisted post',async()=>{
  const {context,page,state,writes}=await fixture();
  try {
    assert.equal(await page.getByRole('option',{name:'Disabled Store · Instagram — publishing disabled'}).getAttribute('disabled'),'');
    assert.equal(await page.getByRole('option',{name:'Reconnect Store · Instagram — reconnect required'}).getAttribute('disabled'),'');
    await page.getByText('Instagram publishing limit: 4 of 50 used over 24 hours.',{exact:true}).waitFor();
    await page.getByLabel('Post text').fill('Our newest arrivals are here. Visit the store this week.');
    await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('alert').waitFor();
    assert.match(await page.getByRole('alert').innerText(),/requires media/);assert.equal(mutations(writes).length,0);
    await addMedia(page);state.invalid=true;
    await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByText('The video is not accessible. Replace its media URL.',{exact:true}).waitFor();assert.equal(mutations(writes).length,0);
    state.invalid=false;state.quotaUsage=50;
    await page.getByRole('radio',{name:'Publish now',exact:true}).check();await page.getByRole('button',{name:'Review post',exact:true}).click();
    await page.getByText('This account has reached its current publishing limit.',{exact:false}).waitFor();assert.equal(mutations(writes).length,0);
    await page.getByRole('radio',{name:'Save draft',exact:true}).check();await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByLabel('Publishing result').waitFor();assert.equal(mutations(writes).at(-1).isDraft,true);
    state.quotaUsage=4;state.mediaUnknown=true;state.status=207;
    await page.getByLabel('Post text').fill('New collection preview');await addMedia(page);
    await page.getByRole('radio',{name:'Publish now',exact:true}).check();await page.getByRole('button',{name:'Review post',exact:true}).click();
    await page.getByRole('button',{name:'Publish now',exact:true}).waitFor();assert.equal(mutations(writes).length,1);
    await page.getByText('A media file has unknown size.',{exact:false}).waitFor();
    await page.screenshot({path:path.join(screenshots,'phase2c-instagram-review-desktop.png'),fullPage:true});
    await page.getByRole('button',{name:'Publish now',exact:true}).click();await page.getByText('Inline publish aborted',{exact:true}).waitFor();
    await page.getByText('Comments toggle may remain on',{exact:true}).waitFor();await page.getByText('instagram · failed: Specific Meta failure',{exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Check with the same request'}).count(),0);assert.equal(mutations(writes).at(-1).platforms[0].platform,'instagram');
    assert.equal(await page.getByLabel('Publishing result').getByText('persisted-post',{exact:true}).count(),1);
    assert.equal(await page.getByRole('link',{name:'View post'}).count(),0);
    await page.screenshot({path:path.join(screenshots,'phase2c-instagram-partial-desktop.png'),fullPage:true});
  } finally {await context.close();}
});

test('Reel, carousel and Story requests use SDK format semantics; schedules remain available at quota',async()=>{
  const {context,page,state,writes}=await fixture();
  try {
    await addMedia(page,'https://media.example/reel.mp4','video');await page.getByLabel('Post text').fill('A look behind the scenes');
    await page.getByRole('checkbox',{name:'Also show the Reel on your profile feed'}).uncheck();
    await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByLabel('Publishing result').waitFor();
    assert.deepEqual(mutations(writes).at(-1).platforms,[{platform:'instagram',accountId:'ig',platformSpecificData:{shareToFeed:false}}]);
    await addMedia(page);await addMedia(page,'https://media.example/slide.mp4','video');
    await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByText('Request completed. The actual post status is shown below.',{exact:true}).waitFor();
    assert.equal(mutations(writes).at(-1).mediaItems.length,2);assert.deepEqual(mutations(writes).at(-1).platforms[0].platformSpecificData,{});
    await page.getByRole('radio',{name:'Story',exact:true}).check();await addMedia(page);
    await page.getByLabel('Post text').fill('Story text is retained but not shown by Instagram');state.quotaUsage=50;
    await page.getByRole('radio',{name:'Schedule',exact:true}).check();await page.getByLabel('Schedule date and time').fill('2030-12-01T12:30');await page.getByLabel('Timezone',{exact:true}).fill('Africa/Cairo');
    await page.getByRole('button',{name:'Review post',exact:true}).click();await page.getByRole('button',{name:'Schedule post',exact:true}).waitFor();
    assert.equal(mutations(writes).length,2);await page.getByRole('button',{name:'Schedule post',exact:true}).click();await page.getByLabel('Publishing result').getByText('scheduled',{exact:true}).waitFor();
    const scheduled=mutations(writes).at(-1);assert.deepEqual(scheduled.platforms[0].platformSpecificData,{contentType:'story'});assert.equal(scheduled.scheduledFor,'2030-12-01T10:30:00.000Z');assert.equal(scheduled.timezone,'Africa/Cairo');
  } finally {await context.close();}
});

test('changing accounts or content discards stale quota/preflight responses and invalidates review',async()=>{
  const {context,page,state,writes}=await fixture();
  try {
    await page.getByLabel('Publishing account').selectOption('fb');state.quotaDelay=250;
    await page.getByLabel('Publishing account').selectOption('ig');await page.getByLabel('Publishing account').selectOption('ig-other');
    await page.getByText('Instagram publishing limit: 1 of 25 used over 24 hours.',{exact:true}).waitFor();await page.waitForTimeout(350);
    assert.equal(await page.getByText('Instagram publishing limit: 4 of 50 used over 24 hours.',{exact:true}).count(),0);
    await addMedia(page);await page.getByLabel('Post text').fill('Ready for review');state.validationDelay=300;state.invalid=true;
    await page.getByRole('radio',{name:'Publish now',exact:true}).check();await page.getByRole('button',{name:'Review post',exact:true}).click();
    await page.getByLabel('Publishing account').selectOption('fb');await page.waitForTimeout(400);
    assert.equal(await page.getByRole('alert').count(),0);assert.equal(await page.getByRole('button',{name:'Publish now',exact:true}).count(),0);assert.equal(mutations(writes).length,0);
    await page.getByRole('button',{name:'Review post',exact:true}).click();await page.getByRole('button',{name:'Publish now',exact:true}).waitFor();
    await page.getByLabel('Post text').fill('Changed after review');await page.getByRole('button',{name:'Review post',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Publish now',exact:true}).count(),0);
  } finally {await context.close();}
});

test('known uploads inspect local metadata and reject unsupported types; captions and the documented 10-item carousel cap are checked',async()=>{
  const {context,page,writes}=await fixture();
  try {
    await page.locator('details').evaluate(node=>node.open=true);
    await page.getByLabel('Upload media',{exact:true}).setInputFiles({name:'animation.gif',mimeType:'image/gif',buffer:Buffer.from('GIF89a')});
    await page.getByText('For Instagram, choose a JPEG or PNG image, or an MP4 or MOV video.',{exact:true}).waitFor();assert.equal(writes.filter(body=>body.action==='presign').length,0);
    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aCfoAAAAASUVORK5CYII=','base64');
    await page.getByLabel('Upload media',{exact:true}).setInputFiles({name:'product.png',mimeType:'image/png',buffer:png});
    await page.getByText('https://media.example/upload.jpg',{exact:true}).waitFor();await page.getByText('Item 1 · 1 × 1 · 0.00 MB',{exact:true}).waitFor();
    assert.equal(writes.find(body=>body.action==='presign').size,png.length);
    await page.getByLabel('Post text').fill('x'.repeat(2201));await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByText('Shorten the caption to 2,200 characters or fewer.',{exact:true}).waitFor();assert.equal(mutations(writes).length,0);
    await page.getByLabel('Post text').fill('🙂'.repeat(1200));await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByLabel('Publishing result').waitFor();assert.equal([...mutations(writes).at(-1).content].length,1200);
    await addMedia(page);
    await page.getByLabel('Post text').fill('Ten views of our new collection');
    for(let index=1;index<=10;index++)await addMedia(page,`https://media.example/product-${index}.jpg`);
    await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(mutations(writes).length,1);
    await page.getByRole('button',{name:'Remove media',exact:true}).last().click();
    await page.getByRole('radio',{name:'Story',exact:true}).check();await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(mutations(writes).length,1);
    await page.getByRole('radio',{name:'Feed / Reel',exact:true}).check();await page.getByRole('button',{name:'Save draft',exact:true}).click();
    await page.getByText('Request completed. The actual post status is shown below.',{exact:true}).waitFor();
    assert.equal(mutations(writes).at(-1).mediaItems.length,10);
  } finally {await context.close();}
});

test('basic IG drafts keep settings; advanced records are read-only; unknown writes remain isolated by profile',async()=>{
  const {context,page,state,writes}=await fixture();
  try {
    state.posts=[{_id:'basic',content:'Existing Reel draft',status:'draft',mediaItems:[{type:'video',url:'https://media.example/reel.mp4'}],platforms:[{platform:'instagram',accountId:'ig',platformSpecificData:{shareToFeed:false}}]},
      {_id:'advanced',content:'Catalog audio draft',status:'draft',mediaItems:[{type:'video',url:'https://media.example/reel.mp4'}],platforms:[{platform:'instagram',accountId:'ig',platformSpecificData:{audioName:'Preserved track',shareToFeed:false}}]},
      {_id:'story',content:'Existing Story draft',status:'draft',mediaItems:[{type:'image',url:'https://media.example/shop.jpg'}],platforms:[{platform:'instagram',accountId:'ig',platformSpecificData:{contentType:'story'}}]}];
    await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.getByText('Existing Reel draft',{exact:true}).waitFor();
    assert.equal(await page.locator('article').filter({hasText:'Catalog audio draft'}).getByRole('button',{name:'Edit',exact:true}).count(),0);
    await page.locator('article').filter({hasText:'Existing Story draft'}).getByRole('button',{name:'Edit',exact:true}).click();assert.equal(await page.getByRole('radio',{name:'Story',exact:true}).isChecked(),true);
    await page.getByRole('button',{name:'Cancel edit',exact:true}).click();
    await page.locator('article').filter({hasText:'Existing Reel draft'}).getByRole('button',{name:'Edit',exact:true}).click();assert.equal(await page.getByRole('checkbox',{name:'Also show the Reel on your profile feed'}).isChecked(),false);
    assert.equal(await page.getByLabel('Publishing account').isDisabled(),true);
    await page.getByLabel('Post text').fill('Updated Reel draft');state.unknown=true;
    await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('button',{name:'Review existing post',exact:true}).waitFor();
    assert.deepEqual(mutations(writes).at(-1).platforms[0].platformSpecificData,{shareToFeed:false});assert.equal(await page.getByRole('button',{name:'Check with the same request'}).count(),0);
    const count=mutations(writes).length;await page.getByRole('button',{name:'Review existing post',exact:true}).click();await page.getByRole('button',{name:'I reviewed the result',exact:true}).waitFor();assert.equal(mutations(writes).length,count);
    await page.getByRole('button',{name:'I reviewed the result',exact:true}).click();await page.getByLabel('Publishing account').selectOption('ig');await addMedia(page);
    await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('button',{name:'Check with the same request'}).waitFor();const intent=mutations(writes).at(-1);
    await page.reload();await page.getByRole('button',{name:'Check with the same request'}).click();await page.getByRole('alert').waitFor();assert.deepEqual(mutations(writes).at(-1),intent);
    state.profile='different-profile';await page.reload();await page.getByLabel('Publishing account').waitFor();assert.equal(await page.getByRole('button',{name:'Check with the same request'}).count(),0);assert.equal(await page.getByLabel('Post text').inputValue(),'');
  } finally {await context.close();}
});

test('Arabic mobile Story journey uses the styled React UI without horizontal overflow',async()=>{
  const {context,page,state,writes}=await fixture();
  try {
    await page.setViewportSize({width:390,height:844});await page.goto(`${origin}/?rtl`);await page.getByLabel('حساب النشر').selectOption('ig');
    await page.getByRole('radio',{name:'قصة',exact:true}).check();await page.getByLabel('نص المنشور').fill('وصلت مجموعتنا الجديدة. أهلاً بكم في متجرنا.');await addMedia(page,'https://media.example/shop.jpg','image',true);
    await page.getByRole('radio',{name:'جدولة',exact:true}).check();await page.getByLabel('Schedule date and time').fill('2030-12-01T12:30');
    await page.getByRole('button',{name:'مراجعة المنشور',exact:true}).click();await page.getByRole('button',{name:'جدولة المنشور',exact:true}).waitFor();
    assert.equal(await page.getByTestId('publishing-workspace').getAttribute('dir'),'rtl');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:path.join(screenshots,'phase2c-instagram-story-mobile-rtl.png'),fullPage:true});
    await page.getByRole('button',{name:'جدولة المنشور',exact:true}).click();await page.getByLabel('Publishing result').waitFor();assert.deepEqual(mutations(writes).at(-1).platforms[0].platformSpecificData,{contentType:'story'});
    state.quotaUsage=50;await page.getByLabel('حساب النشر').selectOption('fb');await page.getByLabel('حساب النشر').selectOption('ig');await page.getByText('تم الوصول إلى الحد الحالي.',{exact:false}).waitFor();
    await page.screenshot({path:path.join(screenshots,'phase2c-instagram-quota-mobile-rtl.png'),fullPage:true});
  } finally {await context.close();}
});

test('document drafts are read-only and saved Reel options are omitted when changing to Story, image or carousel',async()=>{
  const {context,page,state,writes}=await fixture();
  try {
    state.posts=[{_id:'document',content:'Our catalog PDF',status:'draft',mediaItems:[{type:'document',url:'https://media.example/catalog.pdf'}],platforms:[{platform:'facebook',accountId:'fb'}]},
      {_id:'reel',content:'Saved Reel',status:'draft',mediaItems:[{type:'video',url:'https://media.example/reel.mp4'}],platforms:[{platform:'instagram',accountId:'ig',platformSpecificData:{shareToFeed:false}}]}];
    await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.getByText('Our catalog PDF',{exact:true}).waitFor();
    assert.equal(await page.locator('article').filter({hasText:'Our catalog PDF'}).getByRole('button',{name:'Edit',exact:true}).count(),0);
    for(const format of ['story','image','carousel']) {
      await page.locator('article').filter({hasText:'Saved Reel'}).getByRole('button',{name:'Edit',exact:true}).click();
      assert.equal(await page.getByRole('checkbox',{name:'Also show the Reel on your profile feed'}).isChecked(),false);
      if(format==='story') await page.getByRole('radio',{name:'Story',exact:true}).check();
      else {await page.getByRole('button',{name:'Remove media',exact:true}).click();await addMedia(page);if(format==='carousel')await addMedia(page,'https://media.example/other.jpg');}
      await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByLabel('Publishing result').waitFor();
      const last=mutations(writes).at(-1);assert.equal(last.action,'update');assert.equal(last.platforms[0].platformSpecificData.shareToFeed,undefined);assert.equal(last.platforms[0].platformSpecificData.contentType,format==='story'?'story':undefined);
    }
    assert.equal(mutations(writes).some(body=>body.postId==='document'),false);
  } finally {await context.close();}
});

test('unsuccessful replay keeps the uncertain create request when account or policy changes',async()=>{
  const {context,page,state,writes}=await fixture();
  try {
    await addMedia(page);state.unknown=true;await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('button',{name:'Check with the same request'}).waitFor();const original=mutations(writes).at(-1);
    state.unknown=false;
    for(const status of [409,403,400]) {
      state.writeFailure=status;await page.getByRole('button',{name:'Check with the same request'}).click();await page.getByRole('alert').waitFor();
      assert.deepEqual(mutations(writes).at(-1),original);assert.equal(await page.getByRole('button',{name:'Check with the same request'}).count(),1);assert.equal(await page.getByLabel('Publishing account').isDisabled(),true);
      await page.reload();await page.getByRole('button',{name:'Check with the same request'}).waitFor();
    }
  } finally {await context.close();}
});

test('a delayed uncertain-post review cannot restore another profile result or reconciliation controls',async()=>{
  const {context,page,state,reads}=await fixture();
  try {
    state.posts=[{_id:'profile-a-post',content:'Profile A private draft',status:'draft',mediaItems:[{type:'image',url:'https://media.example/shop.jpg'}],platforms:[{platform:'instagram',accountId:'ig'}]}];state.pages=2;
    await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.getByText('Profile A private draft',{exact:true}).waitFor();
    await page.locator('article').getByRole('button',{name:'Edit',exact:true}).click();state.unknown=true;
    await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('button',{name:'Review existing post',exact:true}).waitFor();
    state.postDelay=400;await page.getByRole('button',{name:'Review existing post',exact:true}).click();await page.waitForFunction(()=>true);
    while(!reads.some(read=>read.action==='post'))await page.waitForTimeout(10);
    state.profile='profile-b';state.posts=[];await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByText('Page 2',{exact:true}).waitFor();await page.waitForTimeout(500);
    assert.equal(await page.getByText('Profile A private draft',{exact:true}).count(),0);assert.equal(await page.getByLabel('Publishing result').count(),0);assert.equal(await page.getByRole('button',{name:'I reviewed the result'}).count(),0);assert.equal(await page.getByRole('button',{name:'Review existing post'}).count(),0);assert.equal(await page.getByRole('alert').count(),0);
    assert.equal(await page.getByLabel('Publishing account').isEnabled(),true);
  } finally {await context.close();}
});

test('a failed account refresh during reconciliation clears stale results and leaves refresh available',async()=>{
  const {context,page,state}=await fixture();
  try {
    await addMedia(page);state.status=207;await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByText('Inline publish aborted',{exact:true}).waitFor();
    state.posts=[{_id:'review-post',content:'Review this draft',status:'draft',mediaItems:[{type:'image',url:'https://media.example/shop.jpg'}],platforms:[{platform:'instagram',accountId:'ig'}]}];
    await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.getByText('Review this draft',{exact:true}).waitFor();
    await page.locator('article').getByRole('button',{name:'Edit',exact:true}).click();state.unknown=true;await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('button',{name:'Review existing post',exact:true}).waitFor();
    state.accountsFailure=true;await page.getByRole('button',{name:'Review existing post',exact:true}).click();await page.getByText('Account verification unavailable',{exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Refresh',exact:true}).isEnabled(),true);assert.equal(await page.getByLabel('Publishing result').count(),0);assert.equal(await page.getByText('Inline publish aborted',{exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'I reviewed the result'}).count(),0);
    state.accountsFailure=false;await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.getByRole('button',{name:'Review existing post',exact:true}).waitFor();
  } finally {await context.close();}
});
