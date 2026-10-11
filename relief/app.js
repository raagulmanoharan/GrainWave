import {GrainAccumulation} from './grain-accumulation.js?v=expose-1';
const accumulation=new GrainAccumulation();
import {SceneMemory} from './scene-memory.js?v=splice-1';
const sceneMemory=new SceneMemory();let lastAccent=-Infinity,accent=null;
import {MotionEcho} from './motion-echo.js?v=ghost-1';
import {MotifSong,pulsePitch} from './arrangement.js?v=splice-1';
let song=new MotifSong();
import {fuseSources,handRegions,overlapsHand} from './fusion.js';
import {MotionTracker} from './motion.js?v=traffic-2';
import {MotionExpression} from './expression.js?v=break-1';
import {pitch} from './music.js';
import {PointTracker} from './tracking.js';
const expression=new MotionExpression(),motionEcho=new MotionEcho();
let cameraOffset={x:0,y:0},motionWorker=null,motionBusy=false,lastLiveTime=0;
import {fitCover} from './dither.js';
const $=id=>document.getElementById(id),canvas=$('cloud'),ctx=canvas.getContext('2d'),video=$('feed');
const grainCanvas=document.createElement('canvas'),grainContext=grainCanvas.getContext('2d',{willReadFrequently:true});let feedbackPixels=null,lastGrain=0,grainData=null,lastPercussion=-Infinity,percussionStep=0,songStep=0,nextSongTime=0;

let facing='environment',tracked=[],handWorker=null,handReady=false,handBusy=false,lastHandResult=0,lastHandRequest=0,handFailed=false,handResult={landmarks:[]},motionSources=[],recentRegions=[],lastHandPresence=0;const motionCanvas=document.createElement('canvas'),mc=motionCanvas.getContext('2d',{willReadFrequently:true});
const motionTracker=new MotionTracker(),tracker=new PointTracker(),handCanvas=document.createElement('canvas'),hc=handCanvas.getContext('2d');
let noteBudget=10,wet=null,reverbWet=null;
let stream=null,points=[],threshold=.5,mode='camera',cameraBusy=false,cameraGeneration=0,frame=0,lastSample=0,audio,master,delay,timer,tick=0,nextTime=0,visibleTick=0,playing=false,audioStarting=false,pointer=null;
let currentPitch=null;
let visibleNotes=[];const scheduled=[],reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function status(text){$('status').textContent=text}
function updateThreshold(value){accumulation.reset(performance.now());threshold=Math.max(0,Math.min(1,value));$('threshold-out').textContent=`${Math.round(threshold*100)}%`;$('threshold').value=Math.round(threshold*100);rebuildNotes()}
function releaseCamera(){accumulation.reset();sceneMemory.reset();accent=null;motionEcho.reset();feedbackPixels=null;grainData=null;tracked=[];tracker.reset();expression.reset();cameraOffset={x:0,y:0};motionTracker.reset();motionBusy=false;motionWorker?.postMessage({type:'reset'});lastHandResult=0;lastHandRequest=0;handResult={landmarks:[]};motionSources=[];recentRegions=[];lastHandPresence=0;cameraGeneration++;stream?.getTracks().forEach(track=>track.stop());stream=null;video.srcObject=null}
async function startCamera(){if(cameraBusy||stream)return;cameraBusy=true;const generation=++cameraGeneration;$('camera').disabled=true;status('Opening your camera…');try{if(!navigator.mediaDevices?.getUserMedia)throw Error('Camera requires HTTPS and a supported browser');const incoming=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:facing},width:{ideal:640},height:{ideal:840}}});if(generation!==cameraGeneration){incoming.getTracks().forEach(t=>t.stop());return}stream=incoming;video.srcObject=stream;await video.play();rebuildNotes();$('camera').hidden=true;status('')}catch(error){$('camera').hidden=false;status(error.name==='NotAllowedError'?'Enable camera access in your browser to play.':`Camera unavailable. ${error.message}.`)}finally{cameraBusy=false;$('camera').disabled=false}}
function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio,2);canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d)}new ResizeObserver(resize).observe(canvas);resize();
function trackingStatus(text){if($('tracking-state').textContent!==text)$('tracking-state').textContent=text}
function rebuildNotes(){$('play').disabled=!stream}
function mergeTracking(time){
 const currentHands=time-lastHandResult<350?handResult:{landmarks:[]};
 const {points:input}=fuseSources(currentHands,motionSources,time-lastHandPresence<350?recentRegions:[]);
 expression.observe(input,lastHandResult,time,{cameraOffset,uncertain:motionTracker.cameraUncertain,sensitivity:+$('motion-sensitivity').value/100});
 if(playing&&audio)perform(time);
 tracked=tracker.update(input.filter(p=>(expression.active.get(p.id)||0)>time),time,$('scale').value,noteBudget).map(p=>({...p,midi:pulsePitch(p.y)}));
 rebuildNotes();
 trackingStatus(motionTracker.cameraUncertain?'Hold camera steady':expression.level>.05?'Let it bloom':'Move gently to begin');
 if(handFailed)trackingStatus($('tracking-state').textContent+' · hand tracking unavailable');
}

function initHands(){if(handWorker)return;handWorker=new Worker('hand-worker.js');handWorker.onmessage=({data:d})=>{if(d.type==='ready'){handReady=true;handFailed=false}else if(d.type==='result'){handBusy=false;if(d.generation===cameraGeneration){lastHandResult=performance.now();handResult=d;if(d.landmarks.length){recentRegions=handRegions(d);lastHandPresence=lastHandResult}mergeTracking(lastHandResult)}}else if(d.type==='error'){handBusy=false;handReady=false;handFailed=true;handResult={landmarks:[]};mergeTracking(performance.now())}};handWorker.onerror=()=>{handBusy=false;handReady=false;handFailed=true;handResult={landmarks:[]};mergeTracking(performance.now())}}
async function sampleHands(){const now=performance.now();if(!handReady||handBusy||video.readyState<2||now-lastHandRequest<33)return;handBusy=true;lastHandRequest=now;const generation=cameraGeneration;try{handCanvas.width=320;handCanvas.height=Math.round(320*canvas.clientHeight/canvas.clientWidth);drawCamera(hc,handCanvas.width,handCanvas.height);const image=await createImageBitmap(handCanvas);if(generation!==cameraGeneration){image.close();handBusy=false;return}handWorker.postMessage({type:'frame',image,time:performance.now(),generation},[image])}catch(e){handBusy=false}}
function drawCamera(context,w,h){const crop=fitCover(video.videoWidth,video.videoHeight,w,h);context.save();if($('mirror-toggle').checked){context.translate(w,0);context.scale(-1,1)}context.drawImage(video,crop.x,crop.y,crop.width,crop.height,0,0,w,h);context.restore()}
function receiveMotion(d){if(d.generation!==cameraGeneration)return;motionBusy=false;if(d.type!=='result'){motionSources=[];motionTracker.cameraUncertain=true;return}motionSources=d.sources;motionTracker.state=d.state;motionTracker.cameraMotion=d.cameraMotion;motionTracker.cameraUncertain=d.cameraUncertain;accumulation.camera(d.cameraMotion,d.cameraUncertain,performance.now());cameraOffset.x+=d.cameraMotion.x;cameraOffset.y+=d.cameraMotion.y;mergeTracking(performance.now())}
function initMotion(){try{motionWorker=new Worker('motion-worker.js?v=traffic-2',{type:'module'});motionWorker.onmessage=({data:d})=>receiveMotion(d);motionWorker.onerror=()=>{motionWorker.terminate();motionWorker=null;motionBusy=false;motionTracker.reset()}}catch{motionWorker=null}}
function sampleVideo(){if(video.readyState<2)return;
 const time=performance.now();if(!motionBusy){motionCanvas.id='motion-analysis';motionCanvas.width=320;motionCanvas.height=Math.round(320*canvas.clientHeight/canvas.clientWidth);drawCamera(mc,motionCanvas.width,motionCanvas.height);const data=mc.getImageData(0,0,motionCanvas.width,motionCanvas.height).data;if(sceneMemory.sample(data,motionCanvas.width,motionCanvas.height,time)){accumulation.reset(time);song=new MotifSong();motionEcho.reset();expression.reset();accent=null;currentPitch=null;visibleNotes=[];master?.instrument?.port.postMessage({type:'silence'})}
 if(motionWorker){motionBusy=true;motionWorker.postMessage({type:'frame',data,width:motionCanvas.width,height:motionCanvas.height,time,maximum:noteBudget,sensitivity:+$('motion-sensitivity').value/100,generation:cameraGeneration},[data.buffer])}
 else{const sources=motionTracker.update(data,motionCanvas.width,motionCanvas.height,time,noteBudget,+$('motion-sensitivity').value/100);receiveMotion({type:'result',generation:cameraGeneration,sources,state:motionTracker.state,cameraMotion:motionTracker.cameraMotion,cameraUncertain:motionTracker.cameraUncertain})}}
 mergeTracking(time);sampleHands()}

$('camera').onclick=startCamera;
$('flip-camera').onclick=async()=>{if(cameraBusy)return;stop();releaseCamera();facing=facing==='user'?'environment':'user';points=[];$('play').disabled=true;await startCamera()};
$('mirror-toggle').onchange=()=>{accumulation.reset(performance.now());sceneMemory.reset();song=new MotifSong();motionEcho.reset();cameraGeneration++;tracker.reset();expression.reset();cameraOffset={x:0,y:0};motionTracker.reset();motionBusy=false;motionWorker?.postMessage({type:'reset'});handResult={landmarks:[]};recentRegions=[];lastHandPresence=0;motionSources=[];tracked=[];lastHandResult=0;rebuildNotes();sampleVideo()};

function gradient(w,h,time){const t=reduced?0:time*.00015;ctx.fillStyle='#461329';ctx.fillRect(0,0,w,h);const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,'#682015');g.addColorStop(.48,'#320f20');g.addColorStop(1,'#090811');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);const ax=w*(.65+Math.sin(t)*.25),ay=h*(.23+Math.cos(t*.8)*.17),r=Math.max(w,h)*.85;const glow=ctx.createRadialGradient(ax,ay,0,ax,ay,r);glow.addColorStop(0,'#71340fb0');glow.addColorStop(.35,'#76241760');glow.addColorStop(1,'#7a241200');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);const pink=ctx.createRadialGradient(w*(.15+Math.sin(t+.8)*.15),h*.7,0,w*.1,h*.7,h*.7);pink.addColorStop(0,'#42152e40');pink.addColorStop(1,'#63214400');ctx.fillStyle=pink;ctx.fillRect(0,0,w,h)}
function render(time){const d=Math.min(devicePixelRatio,2),w=canvas.width/d,h=canvas.height/d;ctx.setTransform(d,0,0,d,0,0);if(stream&&time-lastSample>33){sampleVideo();lastSample=time}ctx.clearRect(0,0,w,h);if(stream&&video.readyState>=2){drawCamera(ctx,w,h);drawGrain(w,h,time);motionEcho.draw(ctx,w,h,time,playing? +$('echo').value/100:0)}else gradient(w,h,time);ctx.globalAlpha=1;if(playing&&audio){perform(time);drawNotes(w,h)}drawTracked(w,h);if(accent&&time<accent.until){ctx.fillStyle='#ff533d';ctx.globalAlpha=.65;ctx.fillRect(accent.x*w-3,accent.y*h-3,6,6);ctx.globalAlpha=1}if(playing)rebuildNotes();frame=requestAnimationFrame(render)}
function drawNotes(w,h){
 const note=visibleNotes[0];if(!note||expression.level<.02)return;
 const x=note.point.x*w,y=note.point.y*h;ctx.strokeStyle='#fff4df66';ctx.lineWidth=.7;
 for(const p of tracked.slice(0,3)){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(p.x*w,p.y*h);ctx.stroke()}
 ctx.strokeStyle='#fff6e8';ctx.strokeRect(x-5,y-5,10,10);ctx.fillStyle='#fff6e8';ctx.font='9px monospace';
 const names=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];ctx.fillText(`${names[note.midi%12]}${Math.floor(note.midi/12)-1}`,Math.min(w-30,x+12),Math.max(12,y-10));
}
async function setupAudio(){if(!audio){audio=new(window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});await audio.audioWorklet.addModule('pulse-worklet.js?v=splice-1');master=audio.createGain();master.gain.value=.6;const compressor=audio.createDynamicsCompressor();compressor.threshold.value=-18;master.connect(compressor);compressor.connect(audio.destination);delay=audio.createDelay(1);delay.delayTime.value=60/+$('pulse').value/2;const feedback=audio.createGain();wet=audio.createGain();feedback.gain.value=.32;wet.gain.value=+$('echo').value/180;master.connect(delay);delay.connect(feedback);feedback.connect(delay);delay.connect(wet);wet.connect(compressor);const convolver=audio.createConvolver(),impulse=audio.createBuffer(2,audio.sampleRate*1.1,audio.sampleRate);for(let c=0;c<2;c++){const data=impulse.getChannelData(c);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,3)}convolver.buffer=impulse;reverbWet=audio.createGain();reverbWet.gain.value=+$('reverb').value/100;master.connect(convolver);convolver.connect(reverbWet);reverbWet.connect(compressor)}await audio.resume();instrument(master)}
function instrument(output){if(!output.instrument){output.instrument=new AudioWorkletNode(audio,'relief-pulse',{outputChannelCount:[2]});output.instrument.connect(output)}return output.instrument}
function perform(time){
 const state=expression.advance(time,{release:+$('release').value/100});
 $('gesture-progress').style.width=`${Math.round(state.level*100)}%`;$('gesture-meter').setAttribute('aria-valuenow',Math.round(state.level*100));
 if(state.note){const point={...state.point,gestureDirection:state.direction,gestureTravel:state.level};const candidate={midi:pulsePitch(point.y),velocity:state.level,point};const note=candidate;currentPitch=note.midi;visibleNotes=[note,null,null];visibleTick++;lastLiveTime=time;song.learn(note.midi,songStep,Math.floor(audio.currentTime/(60/+$('pulse').value/2)));}
 if(audio.currentTime-nextSongTime>.2)nextSongTime=audio.currentTime;
 const interval=60/+$('pulse').value/4;
 while(nextSongTime<audio.currentTime+.08){
  for(const event of song.events(songStep,state.level))instrument(master).port.postMessage({...event,freq:event.freq||440*2**((event.midi-69)/12),time:nextSongTime+(event.offset||0),pan:event.pan??(state.point.x-.5)*.5});
  songStep++;nextSongTime+=interval;
 }
 if(state.note&&time-lastPercussion>80){lastPercussion=time;motionEcho.capture(grainCanvas,state.point,time,+$('pulse').value);instrument(master).port.postMessage({type:'tone',kind:'pulse',role:'lead',freq:440*2**((currentPitch-69)/12),level:.18+state.level*.14,duration:Math.min(.24,(.14+Math.min(.08,+$('release').value/1000))*(.65+Math.random()*.65)),noise:.12+ +$('breath').value/600,pan:(state.point.x-.5)*1.2});
  if(Math.random()<.18)instrument(master).port.postMessage({type:'grain',time:audio.currentTime+60/+$('pulse').value*(.25+Math.floor(Math.random()*3)*.25),length:.025+Math.random()*.045,offset:.07+Math.random()*.25,rate:Math.random()<.3?-1:1,level:.1,pan:Math.random()*.8-.4});
  if(Math.random()<.14)instrument(master).port.postMessage({type:'tone',role:'backing',kind:'pulse',freq:440*2**((currentPitch-69)/12),level:.025,duration:.12,time:audio.currentTime+60/+$('pulse').value*(.5+Math.random()),noise:.2});
  if(time-lastAccent>2200&&Math.random()<.08){accent={x:state.point.x,y:state.point.y,until:time+140};lastAccent=time}
 }
 if(currentPitch!==null)instrument(master).port.postMessage({type:'expression',freq:440*2**((currentPitch-69)/12),level:state.level*.8,params:{}});
}
function syncPreview(){document.body.dataset.mode=playing?'playing':'camera';$('play').classList.toggle('playing',playing);$('play').setAttribute('aria-label',playing?'Pause instrument':'Play instrument');$('live-state').textContent=playing?'PLAYING':'LIVE'}
function stop(){accent=null;motionEcho.reset();playing=false;song=new MotifSong();songStep=0;nextSongTime=0;lastPercussion=-Infinity;percussionStep=0;expression.reset();currentPitch=null;visibleNotes=[];master?.instrument?.port.postMessage({type:'silence'});master?.gain.setTargetAtTime(0,audio.currentTime,.08);syncPreview();$('note-readout').textContent='';$('gesture-progress').style.width='0%'}
$('play').onclick=async()=>{if(playing){stop();return}if(!stream||audioStarting)return;audioStarting=true;try{await setupAudio();if(!stream)return;expression.reset();currentPitch=null;song=new MotifSong();songStep=0;nextSongTime=audio.currentTime;playing=true;master.gain.setTargetAtTime(.6,audio.currentTime,.08);syncPreview();status('')}catch(e){status(`Audio could not start: ${e.message}`)}finally{audioStarting=false}};
$('threshold').oninput=()=>updateThreshold(+$('threshold').value/100);
$('scale').onchange=()=>{mergeTracking(performance.now())};
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();releaseCamera();cancelAnimationFrame(frame)}else{frame=requestAnimationFrame(render);startCamera()}});window.addEventListener('pagehide',()=>{stop();releaseCamera();cancelAnimationFrame(frame)});

function setBudget(value){noteBudget=Math.max(1,Math.min(24,Math.round(value)));$('notes-out').textContent=noteBudget;rebuildNotes()}
$('note-budget').oninput=()=>setBudget(+$('note-budget').value);
$('pulse').oninput=()=>{if(delay&&audio)delay.delayTime.setTargetAtTime(60/+$('pulse').value/2,audio.currentTime,.1)};
$('open-settings').onclick=()=>$('settings-panel').showModal();document.querySelector('[data-close]').onclick=()=>$('settings-panel').close();
$('reverb').oninput=()=>{if(reverbWet)reverbWet.gain.setTargetAtTime(+$('reverb').value/100,audio.currentTime,.03)};
$('release').oninput=()=>$('release-out').textContent=`${(+$('release').value/100).toFixed(2)} s`;$('echo').oninput=()=>{$('echo-out').textContent=`${$('echo').value}%`;if(wet&&audio)wet.gain.setTargetAtTime(+$('echo').value/180,audio.currentTime,.03)};
setBudget(10);
initMotion();initHands();document.body.dataset.input='live';updateThreshold(.65);frame=requestAnimationFrame(render);startCamera();

function drawTracked(w,h){
 const sources=tracked.filter(p=>(expression.active.get(p.id)||0)>performance.now()).slice(0,10);
 ctx.save();ctx.lineWidth=1;ctx.font='10px Helvetica, Arial, sans-serif';
 const anchor=sources.find(p=>p.id===expression.point.id)||sources[0];
 if(anchor){ctx.strokeStyle='#fff4df80';for(const p of sources){if(p===anchor)continue;ctx.beginPath();ctx.moveTo(anchor.x*w,anchor.y*h);ctx.lineTo(p.x*w,p.y*h);ctx.stroke()}}
 for(const p of sources){
  const x=p.x*w,y=p.y*h,active=playing&&expression.level>.02&&p.id===expression.point.id;
  ctx.strokeStyle=active?'#ffffff':'#fff0ce';ctx.fillStyle=active?'#fff4df20':'#fff4df0b';
  if(p.box){const b=p.box,bx=Math.max(0,b.x*w-5),by=Math.max(0,b.y*h-5),bw=Math.min(w-bx,b.w*w+10),bh=Math.min(h-by,b.h*h+10);ctx.fillRect(bx,by,bw,bh);ctx.strokeRect(bx,by,bw,bh)}
  ctx.beginPath();ctx.moveTo(x-7,y);ctx.lineTo(x+7,y);ctx.moveTo(x,y-7);ctx.lineTo(x,y+7);ctx.stroke();
  ctx.strokeRect(x-4,y-4,8,8);
  const names=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
  ctx.fillStyle='#fff6e8';ctx.fillText(`${p.name==='object'?'motion':p.name} · ${names[p.midi%12]}${Math.floor(p.midi/12)-1}`,Math.max(8,Math.min(w-100,x+12)),Math.max(14,y-12));
  if(active){ctx.fillStyle='#fff6e8';ctx.fillRect(x-16,y+13,32*expression.level,2)}
 }
 ctx.restore();
}

function drawGrain(w,h,time){
 if(time-lastGrain>40||!grainData){
  grainCanvas.width=Math.min(720,Math.round(w*devicePixelRatio));grainCanvas.height=Math.round(grainCanvas.width*h/w);
  drawCamera(grainContext,grainCanvas.width,grainCanvas.height);grainData=grainContext.getImageData(0,0,grainCanvas.width,grainCanvas.height);
  const pixels=grainData.data,cutoff=.12+threshold*.76,gw=grainData.width,gh=grainData.height;
  if(!feedbackPixels||feedbackPixels.length!==pixels.length/4)feedbackPixels=new Float32Array(pixels.length/4);
  accumulation.prepare(pixels.length/4,time);const exposure=accumulation.exposure(time),frameSeed=Math.floor(time/40);
  const boxes=motionSources.map(p=>p.box).filter(Boolean);
  for(let i=0;i<pixels.length;i+=4){const lum=(pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722)/255;
   let hash=(i/4+1+Math.imul(frameSeed,104729))|0;hash=Math.imul(hash^(hash>>>16),0x45d9f3b);hash=Math.imul(hash^(hash>>>16),0x45d9f3b);const noise=((hash^(hash>>>16))>>>0)/4294967296;
   const index=i/4,x=(index%gw)/gw,y=Math.floor(index/gw)/gh,moving=boxes.some(b=>x>b.x-.02&&x<b.x+b.w+.02&&y>b.y-.02&&y<b.y+b.h+.02);
   const memory=moving?.06:.15,signal=lum*(1-memory)+feedbackPixels[index]*memory;const dark=signal+(noise-.5)*.65<cutoff;feedbackPixels[index]=dark?0:1;
   const light=lum+(noise-.5)*1.05>=cutoff?1:0,formed=accumulation.sample(index,light,moving),amount=moving?0:exposure;
   const tone=(dark?0:1)*(1-amount)+formed*amount;
   pixels[i]=7+230*tone;pixels[i+1]=10+219*tone;pixels[i+2]=14+197*tone;pixels[i+3]=moving?238:255;

  }
  grainContext.putImageData(grainData,0,0);lastGrain=time;
 }
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(grainCanvas,0,0,w,h);ctx.restore();
}
