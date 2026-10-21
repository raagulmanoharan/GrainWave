import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
const base=resolve('.');
const server=createServer(async(req,res)=>{try{const path=resolve(base,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!path.startsWith(base+'/'))throw Error('path');res.setHeader('Content-Type',extname(path)==='.js'?'text/javascript':extname(path)==='.html'?'text/html':extname(path)==='.css'?'text/css':'application/octet-stream');res.end(await readFile(path));}catch{res.statusCode=404;res.end()}}).listen(8765,'127.0.0.1');
const browser=await chromium.launch({headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
try{
 const page=await browser.newPage({viewport:{width:390,height:720}});await page.goto('http://127.0.0.1:8765/relief/index.html');
 const results=await page.evaluate(async()=>{
  const worker=new Worker('./motion-worker.js?v=opencv-only-1');
  const next=()=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Worker timed out')),45000);worker.onmessage=e=>{clearTimeout(timer);resolve(e.data)};worker.onerror=e=>{clearTimeout(timer);reject(Error(e.message))}});
  const ready=await next();if(ready.type!=='ready')throw Error(JSON.stringify(ready));
  const w=160,h=120,results=[];
  function scene(frame,{pan=0,object=0,noise=0,brightness=0,contrast=1}={}){const data=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const xx=x-pan*frame;let lum=95+18*Math.sin(xx*.37)*Math.cos(y*.31)+12*Math.sin(xx*.73+y*.61);const ox=xx-35-object*frame;if(object&&ox>=0&&ox<20&&y>=42&&y<62)lum=145+24*Math.sin(ox*.65)*Math.cos(y*.6);lum=110+(lum-110)*contrast;lum+=brightness*Math.sin(frame*.7)+noise*Math.sin(x*13+y*7+frame*19);const i=(y*w+x)*4;data[i]=data[i+1]=data[i+2]=lum;data[i+3]=255;}return data;}
  for(const [name,options,expected] of [['static',{},false],['noise',{noise:2},false],['exposure',{brightness:15},false],['camera pan',{pan:1},false],['small object',{object:1},true],['slow object',{object:.5},true],['pan and object',{pan:1,object:1},true],['flat static',{contrast:.2,noise:1},false],['flat moving object',{contrast:.2,object:1},true]]){
   worker.postMessage({type:'reset'});let detected=0,offTarget=0,cost=0;
   for(let f=0;f<24;f++){const data=scene(f,options),reply=next();worker.postMessage({type:'frame',data,width:w,height:h,time:f*83,maximum:10,sensitivity:.5,generation:1},[data.buffer]);const r=await reply;if(r.type!=='result')throw Error(JSON.stringify(r));const sources=r.cameraUncertain?[]:r.sources;if(sources.length)detected++;cost+=r.processingMs;for(const p of sources)if(expected&&(p.y<.25||p.y>.65))offTarget++;}
   results.push({name,expected,detected,offTarget,averageMs:cost/24});
  }
  worker.terminate();return results;
 });
 console.log(JSON.stringify(results,null,2));
 for(const r of results){assert(r.expected?r.detected>=3:r.detected===0,r.name);assert.equal(r.offTarget,0,r.name+' unrelated nodes');}

 const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('APP ERROR:',e.message)});
 await page.reload();await page.locator('#cloud').click();console.log('Entry state',await page.evaluate(()=>({mode:document.body.dataset.mode,onboarding:document.body.dataset.onboarding,status:document.querySelector('#status').textContent})),errors);await page.locator('#tour-next').click();
 await page.waitForTimeout(7000);
 const ui=await page.evaluate(()=>({video:document.querySelector('#feed').readyState,nativeDisplay:getComputedStyle(document.querySelector('#feed')).display,playing:document.body.dataset.mode,tracking:document.querySelector('#tracking-state').textContent,status:document.querySelector('#status').textContent}));
 console.log({ui,errors});assert.equal(ui.nativeDisplay,'block');assert(ui.video>=2);assert.equal(ui.playing,'playing');assert(!ui.status.includes('could not load'));assert.deepEqual(errors,[]);

 // A saturated motion snapshot must never reintroduce color; onset is continuous.
 const preview=await page.evaluate(async()=>{
  const {MotionEcho}=await import('./motion-echo.js?v=print-1');
  const {PrintTexture}=await import('./preview-tone.js?v=print-1');
  const source=document.createElement('canvas');source.width=source.height=64;
  const s=source.getContext('2d');s.fillStyle='#ff0000';s.fillRect(0,0,64,64);
  const echo=new MotionEcho();echo.capture(source,{x:.5,y:.5,box:{x:0,y:0,w:1,h:1}},0,120);
  const pixels=echo.frames[0].image.getContext('2d').getImageData(0,0,64,64).data;
  let colored=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]!==pixels[i+1]||pixels[i]!==pixels[i+2])colored++;
  const output=document.createElement('canvas');output.width=output.height=64;const c=output.getContext('2d');
  echo.draw(c,64,64,250,.6);const onset=c.getImageData(32,32,1,1).data[3];
  echo.draw(c,64,64,400,.6);const middle=c.getImageData(32,32,1,1).data[3];
  const texture=new PrintTexture();texture.draw(c,64,64);const cached=texture.pattern;texture.draw(c,64,64);
  return {colored,onset,middle,cached:cached===texture.pattern,filter:getComputedStyle(document.querySelector('#feed')).filter};
 });
 console.log({preview});assert.equal(preview.colored,0);assert.equal(preview.onset,0);assert(preview.middle>0&&preview.middle<80);assert(preview.cached);assert(preview.filter.includes('contrast(1.9)'));assert(preview.filter.includes('invert(1)'));


 // Verify real GPU block sampling, fine grain, and a live shader preview.
 const pixelCheck=await page.evaluate(async()=>{
  const {PixelPreview}=await import('./pixel-preview.js?v=pixels-1');
  const source=document.createElement('canvas');source.width=source.height=64;
  const c=source.getContext('2d');for(let x=0;x<64;x++){c.fillStyle=`rgb(${x*3},${x*3},${x*3})`;c.fillRect(x,0,1,64)}
  const output=document.createElement('canvas'),effect=new PixelPreview(output);
  const plain=effect.draw(source,64,64,.65,false,0),gl=effect.gl;
  const read=()=>{const pixels=new Uint8Array(output.width*output.height*4);gl.readPixels(0,0,output.width,output.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return pixels};
  const before=read(),a=(20*output.width+20)*4,b=a+4;
  effect.draw(source,64,64,.65,false,.16);const after=read();
  let colored=0,changed=0;for(let i=0;i<after.length;i+=4){if(after[i]!==after[i+1]||after[i]!==after[i+2])colored++;if(after[i]!==before[i])changed++}
  const live=document.querySelector('#pixel-preview');
  return {plain,sameBlock:before[a]===before[b],changed,colored,error:gl.getError(),live:!live.hidden,videoVisibility:getComputedStyle(document.querySelector('#feed')).visibility};
 });
 console.log({pixelCheck});assert(pixelCheck.plain);assert(pixelCheck.sameBlock);assert(pixelCheck.changed>100);assert.equal(pixelCheck.colored,0);assert.equal(pixelCheck.error,0);assert(pixelCheck.live);assert.equal(pixelCheck.videoVisibility,'hidden');

 // One shader pass: detailed moving regions, stronger grain, unchanged background.
 const regionalTone=await page.evaluate(async()=>{
  const {PixelPreview}=await import('./pixel-preview.js?v=motion-tone-1');
  const {analysisSize}=await import('./camera-frames.js?v=budget-1');
  const source=document.createElement('canvas');source.width=source.height=64;source.currentTime=1;
  const c=source.getContext('2d');c.fillStyle='rgb(128,128,128)';c.fillRect(0,0,64,64);
  const out=document.createElement('canvas'),effect=new PixelPreview(out),gl=effect.gl;
  let uploads=0;const upload=gl.texImage2D.bind(gl);gl.texImage2D=(...args)=>{uploads++;return upload(...args)};
  const read=()=>{const data=new Uint8Array(64*64*4);gl.readPixels(0,0,64,64,gl.RGBA,gl.UNSIGNED_BYTE,data);return data};
  effect.draw(source,64,64,.65,false,.16);const baseline=read();
  const regions=[{box:{x:.25,y:.25,w:.5,h:.5}}];
  effect.draw(source,64,64,.65,false,.16,regions);const moving=read();
  let outside=0,baseNoise=0,motionNoise=0,count=0;
  for(let y=0;y<64;y++)for(let x=0;x<64;x++){
   const i=(y*64+x)*4;
   if(x<16||x>=48||y<16||y>=48){if(baseline[i]!==moving[i])outside++}
   if(x>=20&&x<44&&y>=20&&y<44){baseNoise+=(baseline[i]-128)**2;motionNoise+=(moving[i]-128)**2;count++}
  }
  effect.draw(source,64,64,.65,false,.16,[]);const cleared=read().every((v,i)=>v===baseline[i]),regionOnlyUploads=uploads;
  for(let x=0;x<64;x++){c.fillStyle=x%2?'rgb(150,150,150)':'rgb(100,100,100)';c.fillRect(x,0,1,64)}source.currentTime++;
  effect.draw(source,64,64,.65,false,0,regions);const detail=read();
  let even=0,odd=0;for(let y=20;y<44;y++)for(let x=20;x<44;x++){if(x%2)odd+=detail[(y*64+x)*4];else even+=detail[(y*64+x)*4]}
  const sizes=[[390,720],[260,650],[1280,600]].map(([w,h])=>analysisSize(w,h));
  return {outside,noiseRatio:motionNoise/baseNoise,cleared,regionOnlyUploads,detailDifference:(odd-even)/(24*12),error:gl.getError(),sizes};
 });
 console.log({regionalTone});assert.equal(regionalTone.outside,0);assert(regionalTone.noiseRatio>5);assert(regionalTone.cleared);assert.equal(regionalTone.regionOnlyUploads,1);assert(regionalTone.detailDifference>60);assert.equal(regionalTone.error,0);
 for(const s of regionalTone.sizes){assert(s.width<=320&&s.height<=640&&s.width*s.height<=160000)}

 // Fine mosaic keeps sub-cell detail, inverts tones and reverts exactly.
 const mosaicCheck=await page.evaluate(async()=>{
  const {PixelPreview}=await import('./pixel-preview.js?v=mosaic-1');
  const {tonePixels}=await import('./preview-tone.js?v=mosaic-1');
  const source=document.createElement('canvas');source.width=source.height=64;const c=source.getContext('2d');
  const out=document.createElement('canvas'),effect=new PixelPreview(out),gl=effect.gl;
  const read=()=>{const p=new Uint8Array(64*64*4);gl.readPixels(0,0,64,64,gl.RGBA,gl.UNSIGNED_BYTE,p);return p};
  for(let x=0;x<64;x++){c.fillStyle=x%2?'rgb(150,150,150)':'rgb(100,100,100)';c.fillRect(x,0,1,64)}
  effect.draw(source,64,64,.65,false,0,[],false);const original=read();
  effect.draw(source,64,64,.65,false,0,[],true);const mosaic=read();
  let even=0,odd=0;for(let y=16;y<48;y++)for(let x=16;x<48;x++){if(x%2)odd+=mosaic[(y*64+x)*4];else even+=mosaic[(y*64+x)*4]}
  effect.draw(source,64,64,.65,false,0,[],false);const reverted=read().every((v,i)=>v===original[i]);
  c.fillStyle='rgb(80,80,80)';c.fillRect(0,0,64,64);
  effect.draw(source,64,64,.65,false,0,[],true);const darkInput=read()[0];
  c.fillStyle='rgb(180,180,180)';c.fillRect(0,0,64,64);
  effect.draw(source,64,64,.65,false,0,[],true);const lightInput=read()[0];
  const echo=new Uint8ClampedArray([80,80,80,255]);tonePixels(echo,.65,true);
  return {reverted,invertedDetail:(even-odd)/(32*16),darkInput,lightInput,echo:echo[0],error:gl.getError()};
 });
 console.log({mosaicCheck});assert(mosaicCheck.reverted);assert(mosaicCheck.invertedDetail>40);assert(mosaicCheck.darkInput>mosaicCheck.lightInput+100);assert(mosaicCheck.echo>180);assert.equal(mosaicCheck.error,0);
 // User-facing rollback is immediate and persists across reload.
 await page.locator('#open-settings').click();await page.locator('#original-look').check();
 assert(await page.locator('#feed').evaluate(v=>!v.style.filter.includes('invert')));
 await page.reload();assert(await page.locator('#original-look').isChecked());
 assert(await page.locator('#feed').evaluate(v=>!v.style.filter.includes('invert')));
 await page.locator('#cloud').click();await page.waitForFunction(()=>document.body.dataset.mode==='playing');
 await page.locator('#open-settings').click();await page.locator('#original-look').uncheck();
 assert(await page.locator('#feed').evaluate(v=>v.style.filter.includes('invert(1)')));
 await page.locator('[data-close]').click();await page.locator('#cloud').click();
 await page.waitForTimeout(1000);

 // Simulate a blocked runtime: the camera must continue and failure must be visible.
 // Count presented frames, not callback invocations: software WebGL can delay JS callbacks.
 const cadence=await page.evaluate(()=>new Promise(resolve=>{
  const video=document.querySelector('#feed');let callbacks=0,first=null;const begin=performance.now();
  const next=(time,metadata)=>{callbacks++;first??=metadata.presentedFrames;if(time-begin>=2000)resolve({presented:metadata.presentedFrames-first,callbacks});else video.requestVideoFrameCallback(next)};
  video.requestVideoFrameCallback(next);
 }));console.log({cameraCadence:cadence});assert(cadence.presented>=25,'Camera frames must continue while tracking runs');

 const blocked=await browser.newPage();await blocked.context().route('**/opencv.js',route=>route.abort());await blocked.goto('http://127.0.0.1:8765/relief/index.html');
 await blocked.waitForFunction(()=>document.querySelector('#status').textContent.includes('could not load'),{},{timeout:10000});
 await blocked.waitForFunction(()=>document.querySelector('#feed').readyState>=2,{},{timeout:10000});
 await blocked.close();

 // Full app: unfamiliar moving texture produces notes through the real OpenCV worker.
 await page.close();
 const motionPage=await browser.newPage({viewport:{width:390,height:720}});
 const requests=[];motionPage.on('request',r=>requests.push(r.url()));
 await motionPage.addInitScript(()=>{
  window.toneMessages=[];window.liveTones=0;window.moveFixture=false;window.workerURLs=[];window.motionFramesSent=0;
  const NativeWorker=window.Worker;window.Worker=class extends NativeWorker{constructor(url,...args){super(url,...args);window.workerURLs.push(String(url))}postMessage(message,...args){if(message?.type==='frame')window.motionFramesSent++;return super.postMessage(message,...args)}};
  const send=MessagePort.prototype.postMessage;
  MessagePort.prototype.postMessage=function(message,...args){if(message?.type==='tone'){window.toneMessages.push(message);if(message.role==='lead')window.liveTones++;}return send.call(this,message,...args)};
  navigator.mediaDevices.getUserMedia=async()=>{
   const c=document.createElement('canvas');c.width=160;c.height=320;const ctx=c.getContext('2d');
   const bg=document.createElement('canvas');bg.width=c.width;bg.height=c.height;const b=bg.getContext('2d'),data=b.createImageData(c.width,c.height);
   for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4,v=95+18*Math.sin(x*.37)*Math.cos(y*.31)+12*Math.sin(x*.73+y*.61);data.data[i]=data.data[i+1]=data.data[i+2]=v;data.data[i+3]=255}b.putImageData(data,0,0);
   const patch=document.createElement('canvas');patch.width=30;patch.height=40;const p=patch.getContext('2d'),pixels=p.createImageData(30,40);
   for(let y=0;y<40;y++)for(let x=0;x<30;x++){const i=(y*30+x)*4,v=160+40*Math.sin(x*.65)*Math.cos(y*.6);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=255}p.putImageData(pixels,0,0);
   let phase=0,last=0;const draw=time=>{if(window.moveFixture)phase+=Math.min(50,time-last)*.0006;last=time;ctx.drawImage(bg,0,0);ctx.drawImage(patch,65+Math.sin(phase)*35,140);requestAnimationFrame(draw)};requestAnimationFrame(draw);return c.captureStream(30);
  };
 });
 await motionPage.goto('http://127.0.0.1:8765/relief/index.html');
 await motionPage.locator('#cloud').click();await motionPage.locator('#tour-next').click();
 await motionPage.waitForTimeout(4000);
 assert.equal(await motionPage.evaluate(()=>window.liveTones),0,'Stationary scene must not play');
 await motionPage.evaluate(()=>window.moveFixture=true);
 await motionPage.waitForFunction(()=>window.liveTones>0,{},{timeout:20000});
 assert(await motionPage.locator('#capture-loop').isEnabled(),'Movement records notes for KEEP');
 await motionPage.evaluate(()=>window.moveFixture=false);
 await motionPage.waitForTimeout(1800);const stopped=await motionPage.evaluate(()=>window.liveTones);
 await motionPage.waitForTimeout(1000);assert.equal(await motionPage.evaluate(()=>window.liveTones),stopped,'Stopped movement releases live notes');
 await motionPage.locator('#open-settings').click();await motionPage.waitForTimeout(300);
 const heldFrames=await motionPage.evaluate(()=>window.motionFramesSent);await motionPage.waitForTimeout(700);
 assert.equal(await motionPage.evaluate(()=>window.motionFramesSent),heldFrames,'Analysis pauses while settings hold live generation');

 await motionPage.locator('[data-close]').click();
 await motionPage.locator('#echo-toggle').click();
 assert.equal(await motionPage.locator('#echo-toggle').getAttribute('aria-pressed'),'true');
 await motionPage.locator('#capture-loop').click();
 assert.equal(await motionPage.locator('#echo-target').textContent(),'LOOP 1');
 assert.equal(await motionPage.locator('#echo-toggle').getAttribute('aria-pressed'),'true','KEEP inherits live echo');
 await motionPage.waitForFunction(()=>window.toneMessages.some(t=>t.role==='echo:loop:1'),{},{timeout:10000});
 await motionPage.locator('#live-toggle').click();
 await motionPage.waitForTimeout(300);
 const paused=await motionPage.evaluate(()=>({frames:window.motionFramesSent,live:window.liveTones,loops:window.toneMessages.filter(t=>t.role==='loop:1').length}));
 await motionPage.evaluate(()=>window.moveFixture=true);
 await motionPage.waitForFunction(count=>window.toneMessages.filter(t=>t.role==='loop:1').length>count,paused.loops,{timeout:15000});
 const afterPause=await motionPage.evaluate(()=>({frames:window.motionFramesSent,live:window.liveTones,loops:window.toneMessages.filter(t=>t.role==='loop:1').length}));
 assert.equal(afterPause.frames,paused.frames);assert.equal(afterPause.live,paused.live);assert(afterPause.loops>paused.loops,'Saved loop keeps playing while live is paused');
 await motionPage.locator('#echo-toggle').click();
 const echoesOff=await motionPage.evaluate(()=>window.toneMessages.filter(t=>t.role==='echo:loop:1').length);
 await motionPage.waitForTimeout(1800);
 assert.equal(await motionPage.evaluate(()=>window.toneMessages.filter(t=>t.role==='echo:loop:1').length),echoesOff);
 await motionPage.locator('[data-loop-id="1"]').click();
 assert.equal(await motionPage.locator('#echo-toggle').getAttribute('aria-pressed'),'true','Live echo stays independent');
 await motionPage.locator('#live-toggle').click();
 await motionPage.waitForFunction(previous=>window.liveTones>previous,paused.live,{timeout:20000});
 await motionPage.waitForFunction(()=>window.toneMessages.some(t=>t.role==='echo:lead'),{},{timeout:10000});
 const liveEcho=await motionPage.evaluate(()=>window.toneMessages.find(t=>t.role==='echo:lead'));
 assert(await motionPage.evaluate(freq=>window.toneMessages.some(t=>t.role==='lead'&&t.freq===freq),liveEcho.freq));
 console.log('Echo inheritance, loop toggle, live pause/resume and independent playback passed');
 const workerURLs=await motionPage.evaluate(()=>window.workerURLs);
 assert.equal(workerURLs.length,1);assert(workerURLs[0].includes('motion-worker.js'));
 assert(!requests.some(url=>/tensorflow|tfjs|coco-ssd|object-worker|hand_landmarker|vision_bundle/.test(url)),'No old detection models requested');
 console.log({openCVOnly:true,liveNotes:stopped,workerURLs});await motionPage.close();

 console.log('OpenCV worker, motion scenes, live app and runtime-failure checks passed');
}finally{await browser.close();server.close()}
