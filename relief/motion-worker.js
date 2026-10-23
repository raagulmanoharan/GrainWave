/* Classic worker: the pinned OpenCV build embeds its WASM runtime. */
let tracker=null,failed=false;
const fail=()=>{failed=true;self.postMessage({type:'unavailable'})};
const timeout=setTimeout(fail,30000);
function ready(api){
 if(failed)return;
 try{if(!api?.Mat)return;tracker=new OpenCVMotion(api);clearTimeout(timeout);self.postMessage({type:'ready'});}catch{fail()}
}
self.onmessage=({data:d})=>{
 if(d.type==='reset'){tracker?.reset();return}
 if(d.type!=='frame'||!tracker||failed)return;
 try{const started=performance.now();const result=tracker.update(d.data,d.width,d.height,d.time,d.maximum,d.sensitivity);self.postMessage({type:'result',...result,processingMs:performance.now()-started,generation:d.generation},result.foreground?[result.foreground.data.buffer]:[])}
 catch(e){tracker.reset();self.postMessage({type:'error',generation:d.generation,message:String(e)})}
};
try{
 importScripts('./motion-opencv.js?v=foreground-1');
 self.Module={onRuntimeInitialized(){ready(self.cv)}};
 importScripts('https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.10.0-release.1/dist/opencv.js');
 if(self.cv?.Mat)ready(self.cv);
 else if(self.cv?.then)self.cv.then(ready);
 else if(self.cv)self.cv.onRuntimeInitialized=()=>ready(self.cv);
}catch{clearTimeout(timeout);fail()}
