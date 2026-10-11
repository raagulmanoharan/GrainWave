import {DepthCloud} from './depth-cloud.js?v=contrast-1';
import {fuseSources,handRegions,overlapsHand} from './fusion.js';
import {MotionTracker} from './motion.js?v=responsive-2';
import {MotionExpression} from './expression.js?v=flow-1';
import {pitch} from './music.js';
import {PhraseComposer} from './phrase.js?v=flow-1';
import {PointTracker} from './tracking.js';
const expression=new MotionExpression(),composer=new PhraseComposer();
let cameraOffset={x:0,y:0},motionWorker=null,motionBusy=false,lastLiveTime=0;
import {fitCover} from './dither.js';
const $=id=>document.getElementById(id),canvas=$('cloud'),ctx=canvas.getContext('2d'),video=$('feed');
const sceneContext=$('scene').getContext('2d');
const depthCloud=new DepthCloud($('depth-cloud'),text=>$('depth-status').textContent=text);

let facing='environment',tracked=[],handWorker=null,handReady=false,handBusy=false,lastHandResult=0,lastHandRequest=0,handFailed=false,handResult={landmarks:[]},motionSources=[],recentRegions=[],lastHandPresence=0;const motionCanvas=document.createElement('canvas'),mc=motionCanvas.getContext('2d',{willReadFrequently:true});
const motionTracker=new MotionTracker(),tracker=new PointTracker(),handCanvas=document.createElement('canvas'),hc=handCanvas.getContext('2d');
let noteBudget=10,wet=null,reverbWet=null;
let stream=null,points=[],threshold=.5,mode='camera',cameraBusy=false,cameraGeneration=0,frame=0,lastSample=0,audio,master,delay,timer,tick=0,nextTime=0,visibleTick=0,playing=false,audioStarting=false,pointer=null;
let currentPitch=null;
let visibleNotes=[];const scheduled=[],reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function status(text){$('status').textContent=text}
function updateThreshold(value){threshold=Math.max(0,Math.min(1,value));$('threshold-out').textContent=`${Math.round(threshold*100)}%`;$('threshold').value=Math.round(threshold*100);rebuildNotes()}
function releaseCamera(){depthCloud.reset();tracked=[];tracker.reset();expression.reset();cameraOffset={x:0,y:0};motionTracker.reset();motionBusy=false;motionWorker?.postMessage({type:'reset'});lastHandResult=0;lastHandRequest=0;handResult={landmarks:[]};motionSources=[];recentRegions=[];lastHandPresence=0;cameraGeneration++;stream?.getTracks().forEach(track=>track.stop());stream=null;video.srcObject=null}
async function startCamera(){if(cameraBusy||stream)return;cameraBusy=true;const generation=++cameraGeneration;$('camera').disabled=true;status('Opening your camera…');try{if(!navigator.mediaDevices?.getUserMedia)throw Error('Camera requires HTTPS and a supported browser');const incoming=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:facing},width:{ideal:640},height:{ideal:840}}});if(generation!==cameraGeneration){incoming.getTracks().forEach(t=>t.stop());return}stream=incoming;video.srcObject=stream;await video.play();rebuildNotes();$('camera').hidden=true;status('Move gently. Let the melody bloom.')}catch(error){$('camera').hidden=false;status(error.name==='NotAllowedError'?'Enable camera access in your browser to play.':`Camera unavailable. ${error.message}.`)}finally{cameraBusy=false;$('camera').disabled=false}}
function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio,2);canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d)}new ResizeObserver(resize).observe(canvas);resize();
function trackingStatus(text){if($('tracking-state').textContent!==text)$('tracking-state').textContent=text}
function rebuildNotes(){$('play').disabled=!stream}
function mergeTracking(time){
 const currentHands=time-lastHandResult<350?handResult:{landmarks:[]};
 const {points:input}=fuseSources(currentHands,motionSources,time-lastHandPresence<350?recentRegions:[]);
 expression.observe(input,lastHandResult,time,{cameraOffset,uncertain:motionTracker.cameraUncertain,sensitivity:+$('motion-sensitivity').value/100});
 tracked=tracker.update(input,time,$('scale').value,noteBudget);
 rebuildNotes();
 trackingStatus(motionTracker.cameraUncertain?'Hold camera steady':expression.level>.05?'Let it bloom':'Move gently to begin');
 if(handFailed)trackingStatus($('tracking-state').textContent+' · hand tracking unavailable');
}

function initHands(){if(handWorker)return;handWorker=new Worker('hand-worker.js');handWorker.onmessage=({data:d})=>{if(d.type==='ready'){handReady=true;handFailed=false}else if(d.type==='result'){handBusy=false;if(d.generation===cameraGeneration){lastHandResult=performance.now();handResult=d;if(d.landmarks.length){recentRegions=handRegions(d);lastHandPresence=lastHandResult}mergeTracking(lastHandResult)}}else if(d.type==='error'){handBusy=false;handReady=false;handFailed=true;handResult={landmarks:[]};mergeTracking(performance.now())}};handWorker.onerror=()=>{handBusy=false;handReady=false;handFailed=true;handResult={landmarks:[]};mergeTracking(performance.now())}}
async function sampleHands(){const now=performance.now();if(!handReady||handBusy||video.readyState<2||now-lastHandRequest<90)return;handBusy=true;lastHandRequest=now;const generation=cameraGeneration;try{handCanvas.width=320;handCanvas.height=Math.round(320*canvas.clientHeight/canvas.clientWidth);drawCamera(hc,handCanvas.width,handCanvas.height);const image=await createImageBitmap(handCanvas);if(generation!==cameraGeneration){image.close();handBusy=false;return}handWorker.postMessage({type:'frame',image,time:performance.now(),generation},[image])}catch(e){handBusy=false}}
function drawCamera(context,w,h){const crop=fitCover(video.videoWidth,video.videoHeight,w,h);context.save();if($('mirror-toggle').checked){context.translate(w,0);context.scale(-1,1)}context.drawImage(video,crop.x,crop.y,crop.width,crop.height,0,0,w,h);context.restore()}
function receiveMotion(d){if(d.generation!==cameraGeneration)return;motionBusy=false;if(d.type!=='result'){motionSources=[];motionTracker.cameraUncertain=true;return}motionSources=d.sources;motionTracker.state=d.state;motionTracker.cameraMotion=d.cameraMotion;motionTracker.cameraUncertain=d.cameraUncertain;cameraOffset.x+=d.cameraMotion.x;cameraOffset.y+=d.cameraMotion.y;mergeTracking(performance.now())}
function initMotion(){try{motionWorker=new Worker('motion-worker.js?v=responsive-2',{type:'module'});motionWorker.onmessage=({data:d})=>receiveMotion(d);motionWorker.onerror=()=>{motionWorker.terminate();motionWorker=null;motionBusy=false;motionTracker.reset()}}catch{motionWorker=null}}
function sampleVideo(){if(video.readyState<2)return;
 const time=performance.now();if(!motionBusy){motionCanvas.width=224;motionCanvas.height=Math.round(224*canvas.clientHeight/canvas.clientWidth);drawCamera(mc,motionCanvas.width,motionCanvas.height);const data=mc.getImageData(0,0,motionCanvas.width,motionCanvas.height).data;
 if(motionWorker){motionBusy=true;motionWorker.postMessage({type:'frame',data,width:motionCanvas.width,height:motionCanvas.height,time,maximum:noteBudget,sensitivity:+$('motion-sensitivity').value/100,generation:cameraGeneration},[data.buffer])}
 else{const sources=motionTracker.update(data,motionCanvas.width,motionCanvas.height,time,noteBudget,+$('motion-sensitivity').value/100);receiveMotion({type:'result',generation:cameraGeneration,sources,state:motionTracker.state,cameraMotion:motionTracker.cameraMotion,cameraUncertain:motionTracker.cameraUncertain})}}
 mergeTracking(time);sampleHands()}

$('camera').onclick=startCamera;
$('flip-camera').onclick=async()=>{if(cameraBusy)return;stop();releaseCamera();facing=facing==='user'?'environment':'user';points=[];$('play').disabled=true;await startCamera()};
$('mirror-toggle').onchange=()=>{depthCloud.reset();cameraGeneration++;tracker.reset();expression.reset();cameraOffset={x:0,y:0};motionTracker.reset();motionBusy=false;motionWorker?.postMessage({type:'reset'});handResult={landmarks:[]};recentRegions=[];lastHandPresence=0;motionSources=[];tracked=[];lastHandResult=0;rebuildNotes();sampleVideo()};

function gradient(w,h,time){const t=reduced?0:time*.00015;ctx.fillStyle='#461329';ctx.fillRect(0,0,w,h);const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,'#682015');g.addColorStop(.48,'#320f20');g.addColorStop(1,'#090811');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);const ax=w*(.65+Math.sin(t)*.25),ay=h*(.23+Math.cos(t*.8)*.17),r=Math.max(w,h)*.85;const glow=ctx.createRadialGradient(ax,ay,0,ax,ay,r);glow.addColorStop(0,'#71340fb0');glow.addColorStop(.35,'#76241760');glow.addColorStop(1,'#7a241200');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);const pink=ctx.createRadialGradient(w*(.15+Math.sin(t+.8)*.15),h*.7,0,w*.1,h*.7,h*.7);pink.addColorStop(0,'#42152e40');pink.addColorStop(1,'#63214400');ctx.fillStyle=pink;ctx.fillRect(0,0,w,h)}
function render(time){const d=Math.min(devicePixelRatio,2),w=canvas.width/d,h=canvas.height/d;ctx.setTransform(d,0,0,d,0,0);const background=$('scene');if(background.width!==canvas.width||background.height!==canvas.height){background.width=canvas.width;background.height=canvas.height}sceneContext.setTransform(d,0,0,d,0,0);sceneContext.fillStyle='#170e16';sceneContext.fillRect(0,0,w,h);if(video.readyState>=2){sceneContext.save();sceneContext.globalAlpha=.82;drawCamera(sceneContext,w,h);sceneContext.restore()}const cloudVisible=stream&&depthCloud.update(time,video,drawCamera,threshold);ctx.clearRect(0,0,w,h);if(!cloudVisible)gradient(w,h,time);if(!cloudVisible&&video.readyState>=2){ctx.save();ctx.globalAlpha=.7;drawCamera(ctx,w,h);ctx.restore()}if(stream&&time-lastSample>60){sampleVideo();lastSample=time}ctx.globalAlpha=1;if(playing&&audio){perform(time);drawNotes(w,h)}drawTracked(w,h);if(playing)rebuildNotes();frame=requestAnimationFrame(render)}
function drawNotes(w,h){
 const note=visibleNotes[0];if(!note||expression.level<.02)return;
 const x=note.point.x*w,y=note.point.y*h;ctx.strokeStyle='#fff4df66';ctx.lineWidth=.7;
 for(const p of tracked.slice(0,3)){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(p.x*w,p.y*h);ctx.stroke()}
 ctx.strokeStyle='#fff6e8';ctx.strokeRect(x-5,y-5,10,10);ctx.fillStyle='#fff6e8';ctx.font='9px monospace';
 const names=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];ctx.fillText(`${names[note.midi%12]}${Math.floor(note.midi/12)-1}`,Math.min(w-30,x+12),Math.max(12,y-10));
}
async function setupAudio(){if(!audio){audio=new(window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});await audio.audioWorklet.addModule('flute-worklet.js?v=flow-1');master=audio.createGain();master.gain.value=.6;const compressor=audio.createDynamicsCompressor();compressor.threshold.value=-18;master.connect(compressor);compressor.connect(audio.destination);delay=audio.createDelay(1);delay.delayTime.value=.32;const feedback=audio.createGain();wet=audio.createGain();feedback.gain.value=.28;wet.gain.value=+$('echo').value/100;master.connect(delay);delay.connect(feedback);feedback.connect(delay);delay.connect(wet);wet.connect(compressor);const convolver=audio.createConvolver(),impulse=audio.createBuffer(2,audio.sampleRate*2.5,audio.sampleRate);for(let c=0;c<2;c++){const data=impulse.getChannelData(c);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,3)}convolver.buffer=impulse;reverbWet=audio.createGain();reverbWet.gain.value=+$('reverb').value/100;master.connect(convolver);convolver.connect(reverbWet);reverbWet.connect(compressor)}await audio.resume()}
function soundSettings(){return {release:+$('release').value/100,pressure:+$('pressure').value/100,breath:+$('breath').value/100,opening:+$('opening').value/100,body:+$('body').value/100,jet:+$('jet').value/100,vibrato:+$('vibrato').value/100}}
function instrument(output){if(!output.instrument){output.instrument=new AudioWorkletNode(audio,'relief-flute',{outputChannelCount:[2]});output.instrument.connect(output)}return output.instrument}
function perform(time){
 const state=expression.advance(time,{tempo:+$('tempo').value,pace:+$('phrase-pace').value===4?1.2:1,release:+$('release').value/100});
 $('gesture-progress').style.width=`${Math.round(state.level*100)}%`;$('gesture-meter').setAttribute('aria-valuenow',Math.round(state.level*100));
 if(state.note){const point={...state.point,gestureDirection:state.direction,gestureTravel:state.level};const candidate={midi:pitch(point.y,$('scale').value,1),velocity:state.level,point};const note=composer.compose(candidate,{scale:$('scale').value,sounding:[],flowing:true});currentPitch=note.midi;visibleNotes=[note,null,null];visibleTick++;lastLiveTime=time;}
 if(currentPitch!==null)instrument(master).port.postMessage({type:'expression',freq:440*2**((currentPitch-69)/12),level:state.level*.8,params:{...soundSettings(),pressure:Math.min(1,+$('pressure').value/100*(.55+state.level*.65))}});
}
function syncPreview(){document.body.dataset.mode=playing?'playing':'camera';$('play').classList.toggle('playing',playing);$('play').setAttribute('aria-label',playing?'Pause instrument':'Play instrument');$('live-state').textContent=playing?'PLAYING':'LIVE'}
function stop(){playing=false;expression.reset();currentPitch=null;visibleNotes=[];master?.instrument?.port.postMessage({type:'silence'});master?.gain.setTargetAtTime(0,audio.currentTime,.08);syncPreview();$('note-readout').textContent='';$('gesture-progress').style.width='0%'}
$('play').onclick=async()=>{if(playing){stop();return}if(!stream||audioStarting)return;audioStarting=true;try{await setupAudio();if(!stream)return;composer.reset();expression.reset();currentPitch=null;playing=true;master.gain.setTargetAtTime(.6,audio.currentTime,.08);syncPreview();status('Gentle motion whispers. Bigger motion blooms. Hold still to rest.')}catch(e){status(`Audio could not start: ${e.message}`)}finally{audioStarting=false}};
$('threshold').oninput=()=>updateThreshold(+$('threshold').value/100);
$('tempo').oninput=()=>$('tempo-out').textContent=`${$('tempo').value} BPM`;$('scale').onchange=()=>{composer.reset();mergeTracking(performance.now())};
$('phrase-pace').onchange=()=>{expression.nextNote=0};
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();releaseCamera();cancelAnimationFrame(frame)}else{frame=requestAnimationFrame(render);startCamera()}});window.addEventListener('pagehide',()=>{stop();releaseCamera();cancelAnimationFrame(frame)});

function setBudget(value){noteBudget=Math.max(1,Math.min(24,Math.round(value)));$('notes-out').textContent=noteBudget;rebuildNotes()}
$('note-budget').oninput=()=>setBudget(+$('note-budget').value);
$('open-settings').onclick=()=>$('settings-panel').showModal();document.querySelector('[data-close]').onclick=()=>$('settings-panel').close();
$('reverb').oninput=()=>{if(reverbWet)reverbWet.gain.setTargetAtTime(+$('reverb').value/100,audio.currentTime,.03)};
$('release').oninput=()=>$('release-out').textContent=`${(+$('release').value/100).toFixed(2)} s`;$('echo').oninput=()=>{$('echo-out').textContent=`${$('echo').value}%`;if(wet&&audio)wet.gain.setTargetAtTime(+$('echo').value/100,audio.currentTime,.03)};
setBudget(10);
initMotion();initHands();document.body.dataset.input='live';updateThreshold(.65);frame=requestAnimationFrame(render);startCamera();

function drawTracked(w,h){
 const lead=tracked.slice(0,3);
 for(const p of lead){const x=p.x*w,y=p.y*h,flash=p.flashUntil>performance.now();ctx.strokeStyle=flash?'#fff6e8':'#f4dbad88';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+4,y);ctx.moveTo(x,y-4);ctx.lineTo(x,y+4);ctx.stroke();ctx.fillStyle='#fff6e833';ctx.fillRect(x-16,y+12,32,2);ctx.fillStyle='#f4dbad';ctx.fillRect(x-16,y+12,32*expression.level,2)}
}
