import {GrainProcessor} from './grain-process.js';
import {AmbientBed} from './ambient.js?v=smooth-1';
let ambientBed=null;
import {LandingType} from './landing-type.js?v=smooth-1';
const landingType=new LandingType();
import {drawPosterPaths} from './poster-paths.js?v=smooth-1';
import {VisualDistortion} from './visual-distortion.js?v=drive-1';
const visualDistortion=new VisualDistortion();
import {VisualLoop} from './visual-loop.js?v=still-2';
const visualLoop=new VisualLoop();let loopHighlights=[];
import {SceneMemory} from './scene-memory.js?v=splice-1';
const sceneMemory=new SceneMemory();let lastAccent=-Infinity,accent=null;
import {MotionEcho} from './motion-echo.js?v=drive-1';
import {pulsePitch,idleTexture} from './arrangement.js?v=loop-1';
import {PhraseSong as MotifSong} from './phrase.js?v=build-1';
let song=new MotifSong();
import {fuseSources,handRegions,overlapsHand} from './fusion.js';
import {MotionTracker} from './motion.js?v=still-2';
import {MotionExpression} from './expression.js?v=still-2';
import {pitch} from './music.js';
import {PointTracker} from './tracking.js';
const expression=new MotionExpression(),motionEcho=new MotionEcho();
let cameraOffset={x:0,y:0},motionWorker=null,motionBusy=false,lastLiveTime=0;
import {fitCover} from './dither.js';
const $=id=>document.getElementById(id),canvas=$('cloud'),ctx=canvas.getContext('2d'),video=$('feed');
const grainCanvas=document.createElement('canvas'),grainContext=grainCanvas.getContext('2d',{willReadFrequently:true});let feedbackPixels=null,lastGrain=0,grainData=null,lastPercussion=-Infinity,percussionStep=0,songStep=0,nextSongTime=0;

let facing='environment',tracked=[],handWorker=null,handReady=false,handBusy=false,lastHandResult=0,lastHandRequest=0,handFailed=false,handResult={landmarks:[]},motionSources=[],recentRegions=[],lastHandPresence=0;const motionCanvas=document.createElement('canvas'),mc=motionCanvas.getContext('2d',{willReadFrequently:true});
const motionTracker=new MotionTracker(),tracker=new PointTracker(),handCanvas=document.createElement('canvas'),hc=handCanvas.getContext('2d');
let noteBudget=10,wet=null,reverbWet=null,delayFeedback=null,feedbackShaper=null;
let stream=null,points=[],threshold=.5,mode='camera',cameraBusy=false,cameraGeneration=0,frame=0,lastSample=0,audio,master,delay,timer,tick=0,nextTime=0,visibleTick=0,playing=false,audioStarting=false,pointer=null;
let currentPitch=null;
let visibleNotes=[];const scheduled=[],reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function status(text){$('status').textContent=text}
function updateThreshold(value){threshold=Math.max(0,Math.min(1,value));$('threshold-out').textContent=`${Math.round(threshold*100)}%`;$('threshold').value=Math.round(threshold*100);rebuildNotes()}
function releaseCamera(){grainBusy=false;grainWorker?.postMessage({type:"reset"});grainFallback.reset();visualDistortion.reset();visualLoop.reset(performance.now());loopHighlights=[];sceneMemory.reset();accent=null;motionEcho.reset();feedbackPixels=null;grainData=null;tracked=[];tracker.reset();expression.reset();cameraOffset={x:0,y:0};motionTracker.reset();motionBusy=false;motionWorker?.postMessage({type:'reset'});lastHandResult=0;lastHandRequest=0;handResult={landmarks:[]};motionSources=[];recentRegions=[];lastHandPresence=0;cameraGeneration++;stream?.getTracks().forEach(track=>track.stop());stream=null;video.srcObject=null}
async function startCamera(){if(cameraBusy||stream)return;cameraBusy=true;const generation=++cameraGeneration;$('camera').disabled=true;status('Opening your camera…');try{if(!navigator.mediaDevices?.getUserMedia)throw Error('Camera requires HTTPS and a supported browser');const incoming=await navigator.mediaDevices.getUserMedia({audio:false,video:{frameRate:{ideal:30,max:30},facingMode:{ideal:facing},width:{ideal:640},height:{ideal:840}}});if(generation!==cameraGeneration){incoming.getTracks().forEach(t=>t.stop());return}stream=incoming;video.srcObject=stream;await video.play();rebuildNotes();$('camera').hidden=true;status('')}catch(error){$('camera').hidden=false;status(error.name==='NotAllowedError'?'Enable camera access in your browser to play.':`Camera unavailable. ${error.message}.`)}finally{cameraBusy=false;$('camera').disabled=false}}
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
function receiveMotion(d){if(d.generation!==cameraGeneration)return;motionBusy=false;if(d.type!=='result'){motionSources=[];motionTracker.cameraUncertain=true;return}motionSources=d.sources;motionTracker.state=d.state;motionTracker.cameraMotion=d.cameraMotion;motionTracker.cameraUncertain=d.cameraUncertain;cameraOffset.x+=d.cameraMotion.x;cameraOffset.y+=d.cameraMotion.y;mergeTracking(performance.now())}
function initMotion(){try{motionWorker=new Worker('motion-worker.js?v=still-2',{type:'module'});motionWorker.onmessage=({data:d})=>receiveMotion(d);motionWorker.onerror=()=>{motionWorker.terminate();motionWorker=null;motionBusy=false;motionTracker.reset()}}catch{motionWorker=null}}
function sampleVideo(){if(video.readyState<2)return;
 const time=performance.now();if(!motionBusy){motionCanvas.id='motion-analysis';const motionHeight=Math.round(320*canvas.clientHeight/canvas.clientWidth);if(motionCanvas.width!==320||motionCanvas.height!==motionHeight){motionCanvas.width=320;motionCanvas.height=motionHeight}drawCamera(mc,motionCanvas.width,motionCanvas.height);const data=mc.getImageData(0,0,motionCanvas.width,motionCanvas.height).data;visualLoop.frame(data,motionCanvas.width,motionCanvas.height,time);if(sceneMemory.sample(data,motionCanvas.width,motionCanvas.height,time)){visualDistortion.reset();visualLoop.reset(time);loopHighlights=[];song=new MotifSong();motionEcho.reset();expression.reset();accent=null;currentPitch=null;visibleNotes=[];master?.instrument?.port.postMessage({type:'silence'})}
 if(motionWorker){motionBusy=true;motionWorker.postMessage({type:'frame',data,width:motionCanvas.width,height:motionCanvas.height,time,maximum:noteBudget,sensitivity:+$('motion-sensitivity').value/100,generation:cameraGeneration},[data.buffer])}
 else{const sources=motionTracker.update(data,motionCanvas.width,motionCanvas.height,time,noteBudget,+$('motion-sensitivity').value/100);receiveMotion({type:'result',generation:cameraGeneration,sources,state:motionTracker.state,cameraMotion:motionTracker.cameraMotion,cameraUncertain:motionTracker.cameraUncertain})}}
 mergeTracking(time);sampleHands()}

$('camera').onclick=startCamera;
$('flip-camera').onclick=async()=>{if(cameraBusy)return;stop();releaseCamera();facing=facing==='user'?'environment':'user';points=[];$('play').disabled=true;await startCamera()};
$('mirror-toggle').onchange=()=>{grainBusy=false;grainWorker?.postMessage({type:'reset'});grainFallback.reset();visualDistortion.reset();visualLoop.reset(performance.now());loopHighlights=[];sceneMemory.reset();song=new MotifSong();motionEcho.reset();cameraGeneration++;tracker.reset();expression.reset();cameraOffset={x:0,y:0};motionTracker.reset();motionBusy=false;motionWorker?.postMessage({type:'reset'});handResult={landmarks:[]};recentRegions=[];lastHandPresence=0;motionSources=[];tracked=[];lastHandResult=0;rebuildNotes();sampleVideo()};

function render(time){const d=Math.min(devicePixelRatio,2),w=canvas.width/d,h=canvas.height/d;ctx.setTransform(d,0,0,d,0,0);if(playing&&stream&&time-lastSample>33){sampleVideo();lastSample=time}ctx.clearRect(0,0,w,h);if(stream&&video.readyState>=2){drawCamera(ctx,w,h);drawGrain(w,h,time);if(playing){motionEcho.draw(ctx,w,h,time,playing? +$('echo').value/100:0,+$('distortion').value/100);visualDistortion.draw(ctx,w,h,time,+$('distortion').value/100)}}else{ctx.fillStyle='#090909';ctx.fillRect(0,0,w,h)}ctx.globalAlpha=1;if(playing&&audio){perform(time)}if(playing){drawTracked(w,h);drawLoopProgress(w,h,time)}if(playing)rebuildNotes();frame=requestAnimationFrame(render)}
async function setupAudio(){if(!audio){audio=new(window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});await audio.audioWorklet.addModule('pulse-worklet.js?v=mono-1');master=audio.createGain();master.gain.value=.6;const compressor=audio.createDynamicsCompressor();compressor.threshold.value=-18;master.connect(compressor);compressor.connect(audio.destination);delay=audio.createDelay(1);delay.delayTime.value=60/+$('pulse').value/2;const feedback=audio.createGain();delayFeedback=feedback;feedbackShaper=audio.createWaveShaper();feedbackShaper.oversample='2x';wet=audio.createGain();feedback.gain.value=.32;wet.gain.value=+$('echo').value/180;delay.connect(feedbackShaper);feedbackShaper.connect(feedback);feedback.connect(delay);delay.connect(wet);wet.connect(compressor);const convolver=audio.createConvolver(),impulse=audio.createBuffer(2,audio.sampleRate*1.1,audio.sampleRate);for(let c=0;c<2;c++){const data=impulse.getChannelData(c);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,3)}convolver.buffer=impulse;reverbWet=audio.createGain();reverbWet.gain.value=+$('reverb').value/100;reverbWet.inputNode=convolver;convolver.connect(reverbWet);reverbWet.connect(compressor)}await audio.resume();if(!ambientBed)ambientBed=new AmbientBed(audio,master);instrument(master);updateDistortion()}
function instrument(output){if(!output.instrument){output.instrument=new AudioWorkletNode(audio,'relief-pulse',{numberOfOutputs:2,outputChannelCount:[2,2]});output.instrument.connect(output,0);output.instrument.connect(delay,1);output.instrument.connect(reverbWet.inputNode,1)}return output.instrument}
function perform(time){
 ambientBed?.advance();
 const state=expression.advance(time,{release:+$('release').value/100});
 $('gesture-progress').style.width=`${Math.round(state.level*100)}%`;$('gesture-meter').setAttribute('aria-valuenow',Math.round(state.level*100));
 const phrasePitch=state.note?song.trigger(state.point.y,time):null;const trigger=phrasePitch!==null;
 if(trigger){visualLoop.movement(time,true);loopHighlights=[];const point={...state.point,gestureDirection:state.direction,gestureTravel:state.level};const candidate={midi:phrasePitch,velocity:state.level,point};const note=candidate;currentPitch=note.midi;visibleNotes=[note,null,null];visualLoop.remember({...point,sourceId:point.id,id:`${point.id}:${note.midi}`,midi:note.midi});visibleTick++;lastLiveTime=time;}
 if(audio.currentTime-nextSongTime>.2)nextSongTime=audio.currentTime;
 visualLoop.progress(time,song.seeded);
 const interval=60/+$('pulse').value/4;
 song.advance(time,state.level,[...expression.active.values()].filter(until=>until>time).length);
 while(nextSongTime<audio.currentTime+.08){
  for(const event of song.events(songStep,state.level,{loop:visualLoop.looping,bpm:+$('pulse').value}).filter(event=>event.role==='lead')){
   instrument(master).port.postMessage({...event,monophonic:true,effectSend:0,kind:'bell',duration:1.8,level:.06,freq:event.freq||440*2**((event.midi-69)/12),time:nextSongTime+(event.offset||0),pan:event.pan??(state.point.x-.5)*.5});
   if(visualLoop.looping&&event.kind==='bell'){const matches=[...visualLoop.points.values()].filter(p=>p.midi===event.midi),point=matches[songStep%Math.max(1,matches.length)];if(point)loopHighlights.push({id:point.id,start:time+(nextSongTime-audio.currentTime)*1000,end:time+(nextSongTime-audio.currentTime)*1000+180})}
  }

  songStep++;nextSongTime+=interval;
 }
 if(trigger){lastPercussion=time;motionEcho.capture(grainCanvas,state.point,time,+$('pulse').value);instrument(master).port.postMessage({type:'tone',kind:'bell',role:'lead',monophonic:true,effectSend:0,freq:440*2**((currentPitch-69)/12),level:.16+state.level*.1+song.build*.045,duration:1.2+Math.random()*1.6,noise:.12+ +$('breath').value/600,pan:(state.point.x-.5)*1.2});
  if(time-lastAccent>2200&&Math.random()<.08&&state.point.box){accent={id:state.point.id,until:time+160};lastAccent=time}
 }
 if(currentPitch!==null)instrument(master).port.postMessage({type:'expression',freq:440*2**((currentPitch-69)/12),level:state.level*.8,params:{}});
}
function syncPreview(){landingType.setPlaying(playing);document.body.dataset.mode=playing?'playing':'camera';$('play').classList.toggle('playing',playing);$('play').setAttribute('aria-label',playing?'Pause instrument':'Start the live instrument');$('live-state').textContent=playing?'PLAYING':'LIVE'}
function stop(){ambientBed?.stop();visualLoop.reset(performance.now());loopHighlights=[];accent=null;motionEcho.reset();playing=false;song=new MotifSong();songStep=0;nextSongTime=0;lastPercussion=-Infinity;percussionStep=0;expression.reset();currentPitch=null;visibleNotes=[];master?.instrument?.port.postMessage({type:'silence'});master?.gain.setTargetAtTime(0,audio.currentTime,.08);syncPreview();$('note-readout').textContent='';$('gesture-progress').style.width='0%'}
$('play').onclick=async()=>{if(playing){stop();return}if(!stream||audioStarting)return;audioStarting=true;try{await setupAudio();if(!stream)return;expression.reset();currentPitch=null;visualLoop.reset(performance.now());loopHighlights=[];song=new MotifSong();songStep=0;nextSongTime=audio.currentTime;playing=true;ambientBed.start();master.gain.setTargetAtTime(.6,audio.currentTime,.08);syncPreview();status('')}catch(e){status(`Audio could not start: ${e.message}`)}finally{audioStarting=false}};
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
 const now=performance.now();loopHighlights=loopHighlights.filter(p=>p.end>now);const sources=playing&&visualLoop.looping?[...visualLoop.points.values()]:tracked.filter(p=>(expression.active.get(p.id)||0)>now).slice(0,6).map(p=>({...p,midi:[...visualLoop.points.values()].reverse().find(n=>n.sourceId===p.id)?.midi??p.midi}));
 ctx.save();ctx.lineWidth=1;ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.setLineDash(visualLoop.looping?[2,4]:[]);ctx.font='10px Helvetica, Arial, sans-serif';
 const anchor=sources.find(p=>(p.sourceId||p.id)===expression.point.id)||sources[0];
 if(anchor){ctx.strokeStyle='#ffffff';for(const p of sources){if(p===anchor)continue;ctx.beginPath();ctx.moveTo(anchor.x*w,anchor.y*h);ctx.lineTo(p.x*w,p.y*h);ctx.stroke()}}
 for(const p of sources){
  const x=p.x*w,y=p.y*h,active=playing&&(visualLoop.looping?loopHighlights.some(n=>n.id===p.id&&n.start<=now):expression.level>.02&&(p.sourceId||p.id)===expression.point.id);
  ctx.lineWidth=1;ctx.strokeStyle='#ffffff';ctx.fillStyle='#ffffff';
  if(p.box){const b=p.box,bx=Math.max(0,b.x*w-5),by=Math.max(0,b.y*h-5),bw=Math.min(w-bx,b.w*w+10),bh=Math.min(h-by,b.h*h+10);ctx.strokeRect(bx,by,bw,bh);if(accent&&accent.id===p.id&&now<accent.until){ctx.save();ctx.globalAlpha=.18;ctx.fillRect(bx,by,bw,bh);ctx.restore()}}
  ctx.beginPath();ctx.moveTo(x-7,y);ctx.lineTo(x+7,y);ctx.moveTo(x,y-7);ctx.lineTo(x,y+7);ctx.stroke();
  ctx.strokeRect(x-4,y-4,8,8);
  const names=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
  ctx.font='10px Helvetica, Arial, sans-serif';const label=`${p.name==='object'?'motion':p.name} · ${names[p.midi%12]}${Math.floor(p.midi/12)-1}`,lx=Math.max(8,Math.min(w-100,x+12)),ly=Math.max(14,y-12);ctx.fillStyle='#ffffff';ctx.fillText(label,lx,ly);
  if(active){ctx.fillStyle='#ffffff';ctx.fillRect(x-16,y+13,32*expression.level,2)}
 }
 ctx.restore();
}

const grainInput=document.createElement('canvas'),grainInputContext=grainInput.getContext('2d',{willReadFrequently:true}),grainFallback=new GrainProcessor();let grainWorker=null,grainBusy=false;
function receiveGrain(frame){if(frame.generation!==cameraGeneration)return;grainBusy=false;if(grainCanvas.width!==frame.width||grainCanvas.height!==frame.height){grainCanvas.width=frame.width;grainCanvas.height=frame.height}grainData=new ImageData(frame.data,frame.width,frame.height);grainContext.putImageData(grainData,0,0)}
try{grainWorker=new Worker('grain-worker.js?v=smooth-1',{type:'module'});grainWorker.onmessage=({data})=>receiveGrain(data);grainWorker.onerror=()=>{grainWorker?.terminate();grainWorker=null;grainBusy=false}}catch{}
function drawGrain(w,h,time){
 if(!grainBusy&&(time-lastGrain>=33||!grainData)){
  const width=Math.max(1,Math.floor(Math.min(420,Math.sqrt(180000*w/h)))),height=Math.max(1,Math.round(width*h/w));
  if(grainInput.width!==width||grainInput.height!==height){grainInput.width=width;grainInput.height=height}
  drawCamera(grainInputContext,width,height);const data=grainInputContext.getImageData(0,0,width,height).data;
  const frame={data,width,height,drive:+$('distortion').value/100,settled:playing?idleTexture(time,expression.lastMotion):0,threshold,playing,boxes:motionSources.map(p=>p.box).filter(Boolean),generation:cameraGeneration};
  lastGrain=time;if(grainWorker){grainBusy=true;grainWorker.postMessage(frame,[data.buffer])}else receiveGrain({...frame,data:grainFallback.process(frame)});
 }
 if(grainData){ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(grainCanvas,0,0,w,h);ctx.restore()}
}

function drawLoopProgress(w,h,time){
 if(!playing||!song.seeded)return;const progress=visualLoop.progress(time,true),x=w/2,y=h-116;
 ctx.save();ctx.fillStyle='#080b11d9';ctx.beginPath();ctx.arc(x,y,11,0,Math.PI*2);ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#ffffff35';ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#ffffff';ctx.beginPath();ctx.arc(x,y,8,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);ctx.stroke();if(visualLoop.looping){ctx.font='9px Helvetica, Arial, sans-serif';ctx.fillStyle='#fff6e8';ctx.textAlign='center';ctx.fillText('loop',x,y-15)}ctx.restore();
}

function updateDistortion(){const amount=+$('distortion').value/100;$('distortion-out').textContent=`${Math.round(amount*100)}%`;master?.instrument?.port.postMessage({type:'drive',amount});if(delayFeedback&&audio)delayFeedback.gain.setTargetAtTime(.32+amount*.16,audio.currentTime,.05);if(feedbackShaper){const curve=new Float32Array(2048);for(let i=0;i<curve.length;i++){const x=i*2/(curve.length-1)-1;curve[i]=(1-amount)*x+amount*Math.tanh(x*(1+amount*4))/(1+amount*2)}feedbackShaper.curve=curve}}
$('distortion').oninput=updateDistortion;updateDistortion();

// The opening canvas is the start control; instrument controls appear after entry.
canvas.setAttribute('role','button');canvas.setAttribute('tabindex','0');canvas.setAttribute('aria-label','Tap to start Relief');
canvas.addEventListener('click',async()=>{if(playing||audioStarting)return;if(!stream)await startCamera();if(stream)$('play').click()});
canvas.addEventListener('keydown',e=>{if(!playing&&(e.key==='Enter'||e.key===' ')){e.preventDefault();canvas.click()}});
