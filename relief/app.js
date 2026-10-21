import {previewFilter,PrintTexture} from './preview-tone.js?v=print-1';
const printTexture=new PrintTexture();
import {ObjectTracks} from './object-tracks.js?v=detection-2';
const objectTracks=new ObjectTracks();
let objectWorker=null,objectReady=false,objectBusy=false,objectLast=-Infinity,objectInterval=800,objectTimer=null,objectWatchdog=null,objectCutoff=-Infinity;
import {CameraFrames} from './camera-frames.js?v=presented-1';
import {UISounds} from './ui-sounds.js';
let uiSounds=null;

import {MotionArpeggio} from './motion-arpeggio.js';
const motionArpeggio=new MotionArpeggio();let pendingArpeggio=[];
import {leadModulation} from './lead-modulation.js';
import {Onboarding} from './onboarding.js?v=quiet-art-1';

import {AmbientBed} from './ambient.js?v=lofi-budget-1';
let ambientBed=null;
import {LandingType} from './landing-type.js?v=cells-1';
const landingType=new LandingType();
import {drawPosterPaths} from './poster-paths.js?v=fine-1';
import {VisualDistortion} from './visual-distortion.js?v=drive-1';
const visualDistortion=new VisualDistortion();
import {VisualLoop} from './visual-loop.js?v=still-2';
const visualLoop=new VisualLoop();let loopHighlights=[];
import {SceneMemory} from './scene-memory.js?v=splice-1';
const sceneMemory=new SceneMemory();let lastAccent=-Infinity,accent=null;
import {MotionEcho} from './motion-echo.js?v=print-1';
import {pulsePitch} from './arrangement.js?v=loop-1';
import {PhraseSong as MotifSong} from './phrase.js?v=timed-2';
import {complementaryPitch} from './layer-harmony.js?v=natural-1';
import {loopStatus} from './loop-status.js?v=keep-flow-1';
const loopColors=['#0a84ff','#ffd60a','#30d158','#bf8cff'];
let lastLayerPitch=null;let capturedNoticeUntil=0;let lastCopyBeat=-1;
import {LoopRack} from './note-buffer.js?v=rack-1';
const noteBuffer=new LoopRack();
let song=new MotifSong(Math.random,{generative:true});

import {MotionExpression} from './expression.js?v=motion-evidence-1';
import {pitch} from './music.js';
import {PointTracker} from './tracking.js?v=motion-evidence-1';
const expression=new MotionExpression(),motionEcho=new MotionEcho();
let cameraOffset={x:0,y:0},motionWorker=null,motionBusy=false,lastLiveTime=0;
import {fitCover} from './dither.js';
const $=id=>document.getElementById(id),canvas=$('cloud'),ctx=canvas.getContext('2d'),video=$('feed');
const cameraFrames=new CameraFrames(video);
canvas.parentElement.insertBefore(video,canvas);video.hidden=false;video.setAttribute('aria-hidden','true');
const grainCanvas=document.createElement('canvas'),grainContext=grainCanvas.getContext('2d',{willReadFrequently:true});let feedbackPixels=null,lastGrain=0,grainData=null,lastPercussion=-Infinity,percussionStep=0,songStep=0,nextSongTime=0;

let motionWidth=320,motionCost=0,motionSamples=0,motionReady=false,motionFailure='',lastMotionSample=-Infinity;
let facing='environment',tracked=[],motionSources=[];const motionCanvas=document.createElement('canvas'),mc=motionCanvas.getContext('2d',{willReadFrequently:true});
const motionTracker={cameraUncertain:false,reset(){this.cameraUncertain=false;lastMotionSample=-Infinity}},tracker=new PointTracker();
let noteBudget=10,wet=null,reverbWet=null,delayFeedback=null,feedbackShaper=null;
let stream=null,points=[],threshold=.5,mode='camera',cameraBusy=false,cameraGeneration=0,frame=0,audio,master,delay,timer,tick=0,nextTime=0,visibleTick=0,playing=false,liveRunning=false,audioStarting=false,pointer=null;
let currentPitch=null;
let visibleNotes=[];const scheduled=[],reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function status(text){$('status').textContent=text||motionFailure}
function updateThreshold(value){threshold=Math.max(0,Math.min(1,value));$('threshold-out').textContent=`${Math.round(threshold*100)}%`;$('threshold').value=Math.round(threshold*100);video.style.filter=previewFilter(threshold);rebuildNotes()}
function clearGestureRun(){pendingArpeggio=[];motionArpeggio.reset();lastLayerPitch=null;lastLiveTime=-Infinity;noteFlash=null}
function releaseCamera(){cameraFrames.reset();motionWidth=320;motionCost=0;motionSamples=0;clearGestureRun();visualDistortion.reset();visualLoop.reset(performance.now());loopHighlights=[];sceneMemory.reset();accent=null;motionEcho.reset();feedbackPixels=null;grainData=null;tracked=[];tracker.reset();expression.reset();cameraOffset={x:0,y:0};motionTracker.reset();objectTracks.reset();objectCutoff=performance.now();objectLast=-Infinity;motionBusy=false;motionWorker?.postMessage({type:'reset'});motionSources=[];cameraGeneration++;stream?.getTracks().forEach(track=>track.stop());stream=null;video.srcObject=null}
let cameraStartPending=null;
async function startCamera(){if(cameraStartPending)return cameraStartPending;cameraStartPending=initializeCamera();try{await cameraStartPending}finally{cameraStartPending=null}}
async function initializeCamera(){if(cameraBusy||stream)return;cameraBusy=true;const generation=++cameraGeneration;$('camera').disabled=true;status('Opening your camera…');try{if(!navigator.mediaDevices?.getUserMedia)throw Error('Camera requires HTTPS and a supported browser');const incoming=await navigator.mediaDevices.getUserMedia({audio:false,video:{frameRate:{ideal:30,max:30},facingMode:{ideal:facing},width:{ideal:640},height:{ideal:840}}});if(generation!==cameraGeneration){incoming.getTracks().forEach(t=>t.stop());return}stream=incoming;video.srcObject=stream;await video.play();if(generation!==cameraGeneration)return;rebuildNotes();$('camera').hidden=true;status('')}catch(error){$('camera').hidden=false;status(error.name==='NotAllowedError'?'Enable camera access in your browser to play.':`Camera unavailable. ${error.message}.`)}finally{cameraBusy=false;$('camera').disabled=false}}
function resize(){const cell=Math.round(Math.max(56,Math.min(80,innerWidth*.16)));canvas.parentElement.style.setProperty('--grid-cell',`${cell}px`);$('settings-panel').style.setProperty('--grid-cell',`${cell}px`);const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio,2);canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d)}new ResizeObserver(resize).observe(canvas);resize();
function trackingStatus(text){if($('tracking-state').textContent!==text)$('tracking-state').textContent=text}
function rebuildNotes(){$('play').disabled=!stream}
function mergeTracking(time){
 const input=motionSources;
 expression.observe(input,0,time,{cameraOffset,uncertain:motionTracker.cameraUncertain,sensitivity:+$('motion-sensitivity').value/100});
 tracked=tracker.update(input.filter(p=>(expression.active.get(p.id)||0)>time),time,$('scale').value,noteBudget).map(p=>({...p,midi:pulsePitch(p.y)}));
 rebuildNotes();
 trackingStatus(!objectReady?'Loading object recognition…':!objectTracks.visible(time).length?'Looking for people, vehicles and animals…':motionTracker.cameraUncertain?'Hold camera steady':expression.level>.05?'Let it bloom':'Move gently to begin');
}

function drawCamera(context,w,h){const crop=fitCover(video.videoWidth,video.videoHeight,w,h);context.save();if($('mirror-toggle').checked){context.translate(w,0);context.scale(-1,1)}context.drawImage(video,crop.x,crop.y,crop.width,crop.height,0,0,w,h);context.restore()}
function receiveMotion(d){if(d.type==='ready'){motionReady=true;trackingStatus('Move gently to begin');return}if(d.type==='unavailable'){motionReady=false;motionBusy=false;motionSources=[];tracked=[];expression.reset();motionFailure='Motion tracking could not load. Reload to retry.';status(motionFailure);return}if(d.generation!==cameraGeneration)return;motionBusy=false;if(d.type!=='result'){motionSources=[];tracked=[];expression.reset();motionTracker.cameraUncertain=true;return}if(Number.isFinite(d.processingMs)){motionCost=motionSamples?motionCost*.8+d.processingMs*.2:d.processingMs;motionSamples++;if(motionSamples>=6&&motionCost>90)motionWidth=320}motionSources=objectReady?objectTracks.update(d.flow||[],performance.now(),{uncertain:d.cameraUncertain,sensitivity:+$('motion-sensitivity').value/100,maximum:noteBudget}):[];motionTracker.state=d.state;motionTracker.cameraMotion=d.cameraMotion;motionTracker.cameraUncertain=d.cameraUncertain;cameraOffset.x+=d.cameraMotion.x;cameraOffset.y+=d.cameraMotion.y;mergeTracking(performance.now())}
function initMotion(){trackingStatus('Loading motion tracking…');try{motionWorker=new Worker('motion-worker.js?v=detection-2');motionWorker.onmessage=({data:d})=>receiveMotion(d);motionWorker.onerror=()=>{motionWorker?.terminate();motionWorker=null;receiveMotion({type:'unavailable'})}}catch{receiveMotion({type:'unavailable'})}}
function sampleVideo(){if(video.readyState<2)return;
 const time=performance.now();if(motionReady&&motionWorker&&!motionBusy&&time-lastMotionSample>=83&&cameraFrames.take('motion',cameraGeneration)){lastMotionSample=time;motionCanvas.id='motion-analysis';const motionHeight=Math.round(motionWidth*canvas.clientHeight/canvas.clientWidth);if(motionCanvas.width!==motionWidth||motionCanvas.height!==motionHeight){motionCanvas.width=motionWidth;motionCanvas.height=motionHeight}drawCamera(mc,motionCanvas.width,motionCanvas.height);const data=mc.getImageData(0,0,motionCanvas.width,motionCanvas.height).data;visualLoop.frame(data,motionCanvas.width,motionCanvas.height,time);if(grainCanvas.width!==motionCanvas.width||grainCanvas.height!==motionCanvas.height){grainCanvas.width=motionCanvas.width;grainCanvas.height=motionCanvas.height}grainContext.drawImage(motionCanvas,0,0);if(sceneMemory.sample(data,motionCanvas.width,motionCanvas.height,time)&&!noteBuffer.loops.length){objectTracks.reset();objectCutoff=time;clearGestureRun();visualDistortion.reset();visualLoop.reset(time);loopHighlights=[];song=new MotifSong(Math.random,{generative:true});motionEcho.reset();expression.reset();accent=null;currentPitch=null;visibleNotes=[];master?.instrument?.port.postMessage({type:'silence'})}
 if(motionWorker){motionBusy=true;motionWorker.postMessage({type:'frame',data,width:motionCanvas.width,height:motionCanvas.height,time,maximum:noteBudget,sensitivity:+$('motion-sensitivity').value/100,generation:cameraGeneration},[data.buffer])}}

 }

$('camera').onclick=startCamera;
$('settings-flip-camera').onchange=async()=>{const toggle=$('settings-flip-camera');if(cameraBusy){toggle.checked=facing==='user';return}toggle.disabled=true;const previous=facing;releaseCamera();facing=toggle.checked?'user':'environment';points=[];await startCamera();if(!stream){facing=previous;toggle.checked=facing==='user';await startCamera()}toggle.disabled=false};
$('mirror-toggle').onchange=()=>{video.style.transform=$('mirror-toggle').checked?'scaleX(-1)':'';clearGestureRun();visualDistortion.reset();visualLoop.reset(performance.now());loopHighlights=[];sceneMemory.reset();song=new MotifSong(Math.random,{generative:true});motionEcho.reset();cameraGeneration++;tracker.reset();expression.reset();cameraOffset={x:0,y:0};motionTracker.reset();motionBusy=false;motionWorker?.postMessage({type:'reset'});motionSources=[];tracked=[];rebuildNotes();sampleVideo()};

function render(time){if(audio?.state==='running')ambientBed?.advance();const d=Math.min(devicePixelRatio,2),w=canvas.width/d,h=canvas.height/d;ctx.setTransform(d,0,0,d,0,0);if((playing||onboarding.active)&&stream){sampleVideo();sampleRecognition(time)}ctx.clearRect(0,0,w,h);if(stream&&video.readyState>=2){if(playing){motionEcho.draw(ctx,w,h,time,playing? +$('echo').value/100:0,+$('distortion').value/100);visualDistortion.draw(ctx,w,h,time,+$('distortion').value/100)}printTexture.draw(ctx,w,h)}else{ctx.fillStyle='#090909';ctx.fillRect(0,0,w,h)}ctx.globalAlpha=1;if(playing&&audio){perform(time)}if(playing){drawTracked(w,h)}frame=requestAnimationFrame(render)}
let audioSetupPending=null,audioReady=false;
// Unlock synchronously within the user gesture, before worklet/network awaits.
function unlockAudio(){
 if(!audio){const Context=window.AudioContext||window.webkitAudioContext;try{audio=new Context({latencyHint:'interactive',sampleRate:32000})}catch{audio=new Context({latencyHint:'interactive'})}}
 try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch{}
 const resumed=audio.resume();resumed.catch(()=>{});
 if(audio.state!=='running'){
  const source=audio.createBufferSource();source.buffer=audio.createBuffer(1,1,audio.sampleRate);
  source.connect(audio.destination);source.onended=()=>source.disconnect();source.start();
 }
}
async function setupAudio(){unlockAudio();if(audioSetupPending)return audioSetupPending;audioSetupPending=initializeAudio();try{await audioSetupPending}catch(error){if(!audioReady){try{await audio?.close()}catch{}audio=null;master=null;delay=null;wet=null;reverbWet=null;delayFeedback=null;feedbackShaper=null}throw error}finally{audioSetupPending=null}}
async function initializeAudio(){if(!audioReady){await audio.audioWorklet.addModule('pulse-worklet.js?v=lofi-budget-1');master=audio.createGain();master.gain.value=.6;const compressor=audio.createDynamicsCompressor();compressor.threshold.value=-18;master.connect(compressor);compressor.connect(audio.destination);delay=audio.createDelay(1);master.connect(delay);delay.delayTime.value=60/+$('pulse').value/2;const feedback=audio.createGain();delayFeedback=feedback;feedbackShaper=audio.createWaveShaper();feedbackShaper.oversample='none';wet=audio.createGain();feedback.gain.value=.32;wet.gain.value=+$('echo').value/180;delay.connect(feedbackShaper);feedbackShaper.connect(feedback);feedback.connect(delay);delay.connect(wet);wet.connect(compressor);const convolver=audio.createConvolver(),impulse=audio.createBuffer(1,audio.sampleRate*.9,audio.sampleRate);for(let c=0;c<1;c++){const data=impulse.getChannelData(c);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,3)}convolver.buffer=impulse;master.connect(convolver);reverbWet=audio.createGain();reverbWet.gain.value=+$('reverb').value/100;reverbWet.inputNode=convolver;convolver.connect(reverbWet);reverbWet.connect(compressor);audioReady=true}await audio.resume();if(!ambientBed)ambientBed=new AmbientBed(audio,master);instrument(master);if(!uiSounds)uiSounds=new UISounds(audio);updateDistortion()}
function instrument(output){if(!output.instrument){output.instrument=new AudioWorkletNode(audio,'relief-pulse',{numberOfOutputs:1,outputChannelCount:[2]});output.instrument.connect(output,0);}return output.instrument}
function perform(time){
 const copyBeat=Math.floor(time/10000);if(copyBeat!==lastCopyBeat){lastCopyBeat=copyBeat;updateLoopStatus()}
 if(capturedNoticeUntil&&time>=capturedNoticeUntil){capturedNoticeUntil=0;syncPreview()}
 for(const l of noteBuffer.loops){const b=document.querySelector(`[data-loop-id="${l.id}"]`);if(b){b.style.setProperty('--phase',`${(l.paused?l.phase:l.clock.progress(time))*100}%`);b.classList.toggle('paused',l.paused)}}
 const state=expression.advance(time,{release:+$('release').value/100});
 $('gesture-progress').style.width=`${Math.round(state.level*100)}%`;$('gesture-meter').setAttribute('aria-valuenow',Math.round(state.level*100));
 const generatedPitch=state.note&&liveRunning&&time-lastLiveTime>=120&&!motionArpeggio.busy(time)?song.trigger(state.point.y,time):null;
 const phrasePitch=generatedPitch===null?null:complementaryPitch(generatedPitch,noteBuffer.harmony(time),time,time,1e9,lastLayerPitch);
 if(phrasePitch!==null&&noteBuffer.loops.length)lastLayerPitch=phrasePitch;const trigger=phrasePitch!==null;
 if(trigger){visualLoop.movement(time,true);if(!noteBuffer.loops.length)loopHighlights=[];const point={...state.point,gestureDirection:state.direction,gestureTravel:state.level};const candidate={midi:phrasePitch,velocity:state.level,point};const note=candidate;noteBuffer.record({...note,time});syncLoopButton();currentPitch=note.midi;visibleNotes=[note,null,null];visualLoop.remember({...point,sourceId:point.id,id:`${point.id}:${note.midi}`,midi:note.midi});visibleTick++;lastLiveTime=time;noteFlash={point,until:time+180};}
 if(audio.currentTime-nextSongTime>.2)nextSongTime=audio.currentTime;
 visualLoop.looping=Boolean(noteBuffer.loops.length);
 const interval=60/+$('pulse').value/4;
 song.advance(time,state.level,[...expression.active.values()].filter(until=>until>time).length);
 while(nextSongTime<audio.currentTime+.08){
  song.mutate(songStep);

  songStep++;nextSongTime+=interval;
 }
 for(const event of noteBuffer.due(time+80)){
  const when=audio.currentTime+Math.max(0,(event.at-time)/1000);
  instrument(master).port.postMessage({type:'tone',kind:'bell',role:`loop:${event.loopId}`,monophonic:false,effectSend:0,duration:1.8,level:(.13+(event.velocity||0)*.08)/Math.sqrt(Math.max(1,noteBuffer.loops.filter(l=>!l.paused).length)),freq:440*2**((event.midi-69)/12),time:when,pan:(event.point.x-.5)*1.2});
  loopHighlights.push({point:event.point,loopId:event.loopId,start:event.at,end:event.at+180});
 }

 if(trigger){pendingArpeggio.push(...motionArpeggio.plan({time,midi:currentPitch,point:state.point,level:state.level,sources:[...expression.active.values()].filter(until=>until>time).length}));const drift=leadModulation(audio.currentTime);lastPercussion=time;if(+$('echo').value>0||+$('distortion').value>0)motionEcho.capture(grainCanvas,state.point,time,+$('pulse').value,threshold);instrument(master).port.postMessage({type:'tone',kind:'bell',role:'lead',monophonic:true,effectSend:0,freq:440*2**((currentPitch-69)/12),level:.12+state.level*.055+song.build*.02,duration:(1.2+Math.random()*1.6)*drift.release,noise:.025+ +$('breath').value/2400+drift.noise,pan:(state.point.x-.5)*1.2});
  if(time-lastAccent>2200&&Math.random()<.08&&state.point.box){accent={id:state.point.id,until:time+160};lastAccent=time}
 }
 if(!liveRunning){pendingArpeggio=[];motionArpeggio.reset()}
 while(liveRunning&&pendingArpeggio.length&&pendingArpeggio[0].at<=time){const event=pendingArpeggio.shift();if(time-event.at>180)continue;noteFlash={point:event.point,until:time+180};const drift=leadModulation(audio.currentTime);event.midi=complementaryPitch(event.midi,noteBuffer.harmony(time),time,time,1e9,lastLayerPitch);lastLayerPitch=event.midi;currentPitch=event.midi;noteBuffer.record({...event,time:event.at});instrument(master).port.postMessage({type:'tone',kind:'bell',role:'lead',monophonic:true,freq:440*2**((event.midi-69)/12),level:(.12+event.velocity*.055)*.85,duration:1.4*drift.release,noise:.025+ +$('breath').value/2400+drift.noise,pan:(event.point.x-.5)*1.2});visualLoop.remember({...event.point,sourceId:event.point.id,id:`arp:${event.at}`,midi:event.midi});visibleNotes=[event,null,null];syncLoopButton()}
}
function syncPreview(){landingType.setPlaying(playing);document.body.dataset.mode=playing?'playing':'camera';$('play').classList.toggle('playing',noteBuffer.selection?!noteBuffer.selection.paused:liveRunning);$('play').classList.toggle('layer-ready',!noteBuffer.selection&&Boolean(noteBuffer.loops.length)&&!liveRunning);$('play').setAttribute('aria-label',noteBuffer.selection?(noteBuffer.selection.paused?'Play selected loop':'Pause selected loop'):liveRunning?'Pause live generation':noteBuffer.loops.length?'Layer live generation over loop':'Start the live instrument');$('play-label').textContent=noteBuffer.selection?(noteBuffer.selection.paused?'PLAY':'PAUSE'):liveRunning?'HOLD':'+ LIVE';$('live-state').textContent=playing?'PLAYING':'LIVE';updateLoopStatus()}
function updateLoopStatus(){const text=playing?loopStatus({loops:noteBuffer.loops,selection:noteBuffer.selection,live:liveRunning,noteCount:noteBuffer.notes.length,saved:performance.now()<capturedNoticeUntil,beat:Math.floor(performance.now()/10000)}):'';const hint=playing&&liveRunning&&!noteBuffer.loops.length&&noteBuffer.notes.length<8?(noteBuffer.notes.length?'Higher in view = higher notes.\nMove faster for a little run.':'Hold the camera steady.\nWave a hand in view to play.'):text;if($('loop-flow').textContent!==hint)$('loop-flow').textContent=hint}
function stop(){pendingArpeggio=[];motionArpeggio.reset();noteBuffer.locked=null;syncLoopButton();ambientBed?.stop();visualLoop.reset(performance.now());loopHighlights=[];accent=null;motionEcho.reset();playing=false;liveRunning=false;song=new MotifSong(Math.random,{generative:true});songStep=0;nextSongTime=0;lastPercussion=-Infinity;percussionStep=0;expression.reset();currentPitch=null;visibleNotes=[];master?.instrument?.port.postMessage({type:'silence'});master?.gain.setTargetAtTime(0,audio.currentTime,.08);syncPreview();$('note-readout').textContent='';$('gesture-progress').style.width='0%'}
function syncLoopButton(){const b=$('capture-loop');b.disabled=!noteBuffer.notes.length||noteBuffer.loops.length>=4;b.setAttribute('aria-pressed',String(Boolean(noteBuffer.loops.length)));b.setAttribute('aria-label',noteBuffer.loops.length>=4?'Four loops captured':'Save your recent notes as a loop');b.querySelector('.capture-label').textContent=noteBuffer.loops.length>=4?'FULL':'KEEP';syncLoopRack();updateLoopStatus()}
let rackViewKey=null;
function syncLoopRack(){
 const viewKey=JSON.stringify([noteBuffer.selected,noteBuffer.loops.map(l=>[l.id,l.paused,l.speed,l.octave])]);
 if(viewKey!==rackViewKey){rackViewKey=viewKey;
 $('loop-stack').replaceChildren(...noteBuffer.loops.map(l=>{const b=document.createElement('button');b.dataset.loopId=l.id;b.className='loop-block';b.style.setProperty('--loop-color',loopColors[(l.id-1)%4]);b.classList.toggle('selected',l.id===noteBuffer.selected);b.classList.toggle('paused',l.paused);b.setAttribute('aria-pressed',String(l.id===noteBuffer.selected));b.setAttribute('aria-label',`Select loop ${l.id}, ${l.speed} times speed, ${l.octave/12} octaves`);b.innerHTML=`<span class="loop-swatch" aria-hidden="true"></span><i></i>`;b.onclick=()=>{noteBuffer.selected=noteBuffer.selected===l.id?null:l.id;syncLoopRack();syncPreview()};return b}));
 }
 $('loop-tools').hidden=!noteBuffer.selection;
 if(noteBuffer.selection){canvas.parentElement.style.setProperty('--selected-loop-color',loopColors[(noteBuffer.selected-1)%4])}
 updateLoopStatus();
}
function releaseSelected(){if(noteBuffer.selection)instrument(master).port.postMessage({type:'release-role',role:`loop:${noteBuffer.selected}`})}
$('capture-loop').onclick=()=>{if(!noteBuffer.capture(performance.now()))return;capturedNoticeUntil=performance.now()+1800;lastLayerPitch=null;liveRunning=true;visualLoop.looping=true;syncLoopButton();syncPreview()};
for(const [id,factor] of [['loop-half',.5],['loop-double',2]])$(id).onclick=()=>{releaseSelected();noteBuffer.speed(factor,performance.now());syncLoopRack()};
for(const [id,octave] of [['loop-down',-12],['loop-up',12]])$(id).onclick=()=>{releaseSelected();noteBuffer.transpose(octave);syncLoopRack()};
$('play').onclick=async()=>{if(playing){if(noteBuffer.selection){releaseSelected();noteBuffer.togglePause(performance.now());syncLoopRack();syncPreview()}else if(noteBuffer.loops.length){liveRunning=!liveRunning;expression.reset();syncPreview()}else stop();return}if(!stream||audioStarting)return;audioStarting=true;try{await setupAudio();if(!stream)return;expression.reset();currentPitch=null;visualLoop.reset(performance.now());loopHighlights=[];song=new MotifSong(Math.random,{generative:true});songStep=0;nextSongTime=audio.currentTime;playing=true;liveRunning=true;ambientBed.start();master.gain.setTargetAtTime(.6,audio.currentTime,.08);syncPreview();status('')}catch(e){status(`Audio could not start: ${e.message}`)}finally{audioStarting=false}};
$('threshold').oninput=()=>updateThreshold(+$('threshold').value/100);
$('scale').onchange=()=>{mergeTracking(performance.now())};
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();releaseCamera();cancelAnimationFrame(frame)}else{frame=requestAnimationFrame(render);startCamera()}});window.addEventListener('pagehide',()=>{stop();releaseCamera();cancelAnimationFrame(frame)});

function setBudget(value){noteBudget=Math.max(1,Math.min(24,Math.round(value)));$('notes-out').textContent=noteBudget;rebuildNotes()}
$('note-budget').oninput=()=>setBudget(+$('note-budget').value);
$('pulse').oninput=()=>{if(delay&&audio)delay.delayTime.setTargetAtTime(60/+$('pulse').value/2,audio.currentTime,.1)};
const settingsPanel=$('settings-panel');canvas.parentElement.append(settingsPanel);let resumeLiveAfterSettings=false;
function closeSettings(){settingsPanel.close();delete document.body.dataset.settings;liveRunning=resumeLiveAfterSettings&&playing;expression.reset();syncPreview()}
$('open-settings').onclick=()=>{resumeLiveAfterSettings=liveRunning;liveRunning=false;expression.reset();master?.instrument?.port.postMessage({type:'release-role',role:'lead'});document.body.dataset.settings='true';settingsPanel.show();syncPreview()};
document.querySelector('[data-close]').onclick=closeSettings;
document.addEventListener('keydown',e=>{if(settingsPanel.open&&e.key==='Escape'){e.preventDefault();closeSettings()}});

$('reverb').oninput=()=>{if(reverbWet)reverbWet.gain.setTargetAtTime(+$('reverb').value/100,audio.currentTime,.03)};
$('release').oninput=()=>$('release-out').textContent=`${(+$('release').value/100).toFixed(2)} s`;$('echo').oninput=()=>{$('echo-out').textContent=`${$('echo').value}%`;if(wet&&audio)wet.gain.setTargetAtTime(+$('echo').value/180,audio.currentTime,.03)};
setBudget(10);
initMotion();initObjects();document.body.dataset.input='live';updateThreshold(.65);frame=requestAnimationFrame(render);startCamera();

let noteFlash=null;
function drawTracked(w,h){
 // Recognition is visible independently of the music's movement gate.
 ctx.save();ctx.lineWidth=1;ctx.font='12px Helvetica, Arial, sans-serif';
 for(const object of objectTracks.visible(performance.now())){
  const b=object.box,x=b.x*w,y=b.y*h;
  ctx.strokeStyle='rgba(255,255,255,.7)';ctx.setLineDash([4,4]);ctx.strokeRect(x,y,b.w*w,b.h*h);
  const label=object.label;ctx.setLineDash([]);ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillRect(x,Math.max(0,y-20),ctx.measureText(label).width+12,18);ctx.fillStyle='#fff';ctx.fillText(label,x+6,Math.max(13,y-7));
 }
 ctx.restore();
 const now=performance.now();loopHighlights=loopHighlights.filter(p=>p.end>now);const sources=liveRunning?tracked.filter(p=>(expression.active.get(p.id)||0)>now).slice(0,6).map(p=>({...p,midi:[...visualLoop.points.values()].reverse().find(n=>n.sourceId===p.id)?.midi??p.midi})):[];
 ctx.save();if(noteFlash&&liveRunning&&noteFlash.until>now){const x=noteFlash.point.x*w,y=noteFlash.point.y*h;ctx.fillStyle='#fff';ctx.globalAlpha=(noteFlash.until-now)/180;ctx.fillRect(x-4,y-4,8,8);ctx.globalAlpha=1}for(const event of loopHighlights){if(event.start<=now){ctx.fillStyle=loopColors[(event.loopId-1)%loopColors.length];ctx.fillRect(Math.round(event.point.x*w),Math.round(event.point.y*h),2,2)}}ctx.lineWidth=1;ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.setLineDash([]);ctx.font='10px Helvetica, Arial, sans-serif';
 const anchor=sources.find(p=>(p.sourceId||p.id)===expression.point.id)||sources[0];
 if(anchor){ctx.strokeStyle='#ffffff';for(const p of sources){if(p===anchor)continue;ctx.beginPath();ctx.moveTo(anchor.x*w,anchor.y*h);ctx.lineTo(p.x*w,p.y*h);ctx.stroke()}}
 for(const p of sources){
  const x=p.x*w,y=p.y*h,active=liveRunning&&expression.level>.02&&(p.sourceId||p.id)===expression.point.id;
  ctx.lineWidth=1;ctx.strokeStyle='#ffffff';ctx.fillStyle='#ffffff';
  if(p.box){const b=p.box,bx=Math.max(0,b.x*w-5),by=Math.max(0,b.y*h-5),bw=Math.min(w-bx,b.w*w+10),bh=Math.min(h-by,b.h*h+10);ctx.strokeRect(bx,by,bw,bh);if(accent&&accent.id===p.id&&now<accent.until){ctx.save();ctx.globalAlpha=.18;ctx.fillRect(bx,by,bw,bh);ctx.restore()}}
  ctx.beginPath();ctx.moveTo(x-7,y);ctx.lineTo(x+7,y);ctx.moveTo(x,y-7);ctx.lineTo(x,y+7);ctx.stroke();
  ctx.strokeRect(x-4,y-4,8,8);
  const names=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
  ctx.font='10px Helvetica, Arial, sans-serif';const label=`${p.label||(p.name==='object'?'motion':p.name)} · ${names[p.midi%12]}${Math.floor(p.midi/12)-1}`,lx=Math.max(8,Math.min(w-100,x+12)),ly=Math.max(14,y-12);ctx.fillStyle='#ffffff';ctx.fillText(label,lx,ly);
  if(active){ctx.fillStyle='#ffffff';ctx.fillRect(x-16,y+13,32*expression.level,2)}
 }
 ctx.restore();
}


function updateDistortion(){const amount=+$('distortion').value/100;$('distortion-out').textContent=`${Math.round(amount*100)}%`;master?.instrument?.port.postMessage({type:'drive',amount});if(delayFeedback&&audio)delayFeedback.gain.setTargetAtTime(.32+amount*.16,audio.currentTime,.05);if(feedbackShaper){const curve=new Float32Array(2048);for(let i=0;i<curve.length;i++){const x=i*2/(curve.length-1)-1;curve[i]=(1-amount)*x+amount*Math.tanh(x*(1+amount*4))/(1+amount*2)}feedbackShaper.curve=curve}}
$('distortion').oninput=updateDistortion;updateDistortion();

// Unlock the ambient welcome on the first browser-authorized interaction.
async function startWelcomeChords(){try{await setupAudio();master.gain.setTargetAtTime(.6,audio.currentTime,.08);ambientBed.start()}catch(e){status(`Audio could not start: ${e.message}`)}}
document.addEventListener('pointerdown',()=>{try{unlockAudio();if(!ambientBed)startWelcomeChords()}catch(e){status(`Audio could not start: ${e.message}`)}});
document.addEventListener('keydown',()=>{try{unlockAudio();if(!ambientBed)startWelcomeChords()}catch{}});
// The opening canvas is the start control; instrument controls appear after entry.
canvas.setAttribute('role','button');canvas.setAttribute('tabindex','0');canvas.setAttribute('aria-label','Tap to start Relief');
const onboarding=new Onboarding({onOpen:()=>{landingType.setPlaying(true);status('')},onFinish:async()=>{if(playing)return true;await startCamera();if(!stream){$('tour-copy').textContent='Allow camera access in your browser, then tap GO to try again.';return false}await $('play').onclick();return playing}});
$('flip-camera').onclick=()=>onboarding.open();
canvas.addEventListener('click',async()=>{if(playing||audioStarting||onboarding.active)return;if(!onboarding.seen){onboarding.open();return}await startCamera();if(stream)$('play').click()});
canvas.parentElement.addEventListener('click',e=>{if(e.target===canvas||e.target.closest('button,input,select,dialog,#onboarding'))return;if(!playing&&!onboarding.active)canvas.click()});
canvas.addEventListener('keydown',e=>{if(!playing&&(e.key==='Enter'||e.key===' ')){e.preventDefault();canvas.click()}});

let theme='dark';try{theme=localStorage.getItem('relief-theme')==='light'?'light':'dark'}catch{}
function applyTheme(value){document.body.dataset.theme=value;$('light-mode').checked=value==='light';document.querySelector('meta[name="theme-color"]').content=value==='light'?'#ffffff':'#080808';try{localStorage.setItem('relief-theme',value)}catch{}}
applyTheme(theme);$('light-mode').onchange=()=>applyTheme($('light-mode').checked?'light':'dark');

document.addEventListener('click',async e=>{const button=e.target.closest('button');if(!button||button.disabled)return;const kind=button.id==='capture-loop'?'keep':button.id==='tour-next'?'next':button.matches('[data-close],#tour-close')?'close':'tap';try{if(!uiSounds)await setupAudio();else if(audio.state==='suspended')await audio.resume();uiSounds?.play(kind)}catch{} },{capture:true});
document.addEventListener('change',e=>{if(e.target.matches('input[type=checkbox],select'))uiSounds?.play('tap')});

function objectFailure(){objectReady=false;objectBusy=false;clearTimeout(objectTimer);clearTimeout(objectWatchdog);objectWorker?.terminate();objectWorker=null;objectTracks.reset();motionSources=[];tracked=[];expression.reset();motionFailure='Object recognition could not load. Reload to retry.';status(motionFailure)}
function initObjects(){
 try{
  objectWorker=new Worker('object-worker.js?v=detection-2');
  objectTimer=setTimeout(objectFailure,60000);
  objectWorker.onmessage=({data:d})=>{
   if(d.type==='ready'){clearTimeout(objectTimer);objectReady=true;return}
   if(d.type==='unavailable'){objectFailure();return}
   objectBusy=false;clearTimeout(objectWatchdog);
   if(d.generation!==cameraGeneration)return;
   if(d.type!=='result'){objectFailure();return}
   objectInterval=Math.max(800,Math.min(2000,d.processingMs*3));
   if(d.time>=objectCutoff)objectTracks.detect(d.predictions,d.time,performance.now());
  };
  objectWorker.onerror=objectFailure;
 }catch{objectFailure()}
}
function sampleObjects(data,width,height,time){
 if(!objectReady||objectBusy||!liveRunning||document.hidden||time-objectLast<objectInterval)return;
 objectBusy=true;objectLast=time;const copy=data.slice();
 objectWatchdog=setTimeout(objectFailure,10000);
 objectWorker.postMessage({type:'frame',data:copy,width,height,time,generation:cameraGeneration},[copy.buffer]);
}

const recognitionCanvas=document.createElement('canvas'),recognitionContext=recognitionCanvas.getContext('2d',{willReadFrequently:true});
function sampleRecognition(time){
 if(!objectReady||objectBusy||!liveRunning||document.hidden||video.readyState<2||time-objectLast<objectInterval)return;
 const width=320,height=Math.max(1,Math.round(width*canvas.clientHeight/canvas.clientWidth));
 if(recognitionCanvas.width!==width||recognitionCanvas.height!==height){recognitionCanvas.width=width;recognitionCanvas.height=height}
 drawCamera(recognitionContext,width,height);
 sampleObjects(recognitionContext.getImageData(0,0,width,height).data,width,height,time);
}
