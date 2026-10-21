import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
const base=resolve('.');
const server=createServer(async(req,res)=>{try{const path=resolve(base,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!path.startsWith(base+'/'))throw Error('path');res.setHeader('Content-Type',extname(path)==='.js'?'text/javascript':extname(path)==='.html'?'text/html':extname(path)==='.css'?'text/css':'application/octet-stream');res.end(await readFile(path));}catch{res.statusCode=404;res.end()}}).listen(8765,'127.0.0.1');
const browser=await chromium.launch({headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:8765/relief/index.html');
 const results=await page.evaluate(async()=>{
  const worker=new Worker('./motion-worker.js?v=opencv-1');
  const next=()=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Worker timed out')),45000);worker.onmessage=e=>{clearTimeout(timer);resolve(e.data)};worker.onerror=e=>{clearTimeout(timer);reject(Error(e.message))}});
  const ready=await next();if(ready.type!=='ready')throw Error(JSON.stringify(ready));
  const w=160,h=120,results=[];
  function scene(frame,{pan=0,object=0,noise=0,brightness=0}={}){const data=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const xx=x-pan*frame;let lum=95+18*Math.sin(xx*.37)*Math.cos(y*.31)+12*Math.sin(xx*.73+y*.61);const ox=xx-35-object*frame;if(object&&ox>=0&&ox<20&&y>=42&&y<62)lum=145+24*Math.sin(ox*.65)*Math.cos(y*.6);lum+=brightness*Math.sin(frame*.7)+noise*Math.sin(x*13+y*7+frame*19);const i=(y*w+x)*4;data[i]=data[i+1]=data[i+2]=lum;data[i+3]=255;}return data;}
  for(const [name,options,expected] of [['static',{},false],['noise',{noise:2},false],['exposure',{brightness:15},false],['camera pan',{pan:1},false],['small object',{object:1},true],['slow object',{object:.5},true],['pan and object',{pan:1,object:1},true]]){
   worker.postMessage({type:'reset'});let detected=0,offTarget=0,cost=0;
   for(let f=0;f<24;f++){const data=scene(f,options),reply=next();worker.postMessage({type:'frame',data,width:w,height:h,time:f*83,maximum:10,sensitivity:.5,generation:1},[data.buffer]);const r=await reply;if(r.type!=='result')throw Error(JSON.stringify(r));if(r.sources.length)detected++;cost+=r.processingMs;for(const p of r.sources)if(expected&&(p.y<.25||p.y>.65))offTarget++;}
   results.push({name,expected,detected,offTarget,averageMs:cost/24});
  }
  worker.terminate();return results;
 });
 console.log(JSON.stringify(results,null,2));
 for(const r of results){assert(r.expected?r.detected>=3:r.detected===0,r.name);assert.equal(r.offTarget,0,r.name+' unrelated nodes');}
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.reload();await page.locator('#cloud').click();await page.locator('#tour-next').click();
 await page.waitForTimeout(7000);
 const ui=await page.evaluate(()=>({video:document.querySelector('#feed').readyState,nativeDisplay:getComputedStyle(document.querySelector('#feed')).display,playing:document.body.dataset.mode,tracking:document.querySelector('#tracking-state').textContent,status:document.querySelector('#status').textContent}));
 console.log({ui,errors});assert.equal(ui.nativeDisplay,'block');assert(ui.video>=2);assert.equal(ui.playing,'playing');assert(!ui.status.includes('could not load'));assert.deepEqual(errors,[]);
 // Simulate a blocked runtime: the camera must continue and failure must be visible.
 const cadence=await page.evaluate(()=>new Promise(resolve=>{const video=document.querySelector('#feed');let count=0;const begin=performance.now();const next=()=>{count++;if(performance.now()-begin>=2000)resolve(count);else video.requestVideoFrameCallback(next)};video.requestVideoFrameCallback(next)}));console.log({videoFramesInTwoSeconds:cadence});assert(cadence>=25,'Video must continue while tracking runs');
 const blocked=await browser.newPage();await blocked.context().route('**/opencv.js',route=>route.abort());await blocked.goto('http://127.0.0.1:8765/relief/index.html');
 await blocked.waitForFunction(()=>document.querySelector('#status').textContent.includes('could not load'),{},{timeout:10000});
 assert(await blocked.locator('#feed').evaluate(v=>v.readyState>=2));
 await blocked.close();
 console.log('OpenCV worker, motion scenes, live app and runtime-failure checks passed');
}finally{await browser.close();server.close()}
