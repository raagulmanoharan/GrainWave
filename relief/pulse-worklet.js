// Original pre-rendered drum one-shots, shared by every voice. No external recordings.
function drumKit(){const kit={};let seed=7331;const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/2147483648-1};for(const kind of ['kick','snare','hat']){const length=Math.floor(sampleRate*(kind==='kick'?.22:kind==='snare'?.16:.1)),data=new Float32Array(length);let phase=0,low=0,body=0;for(let i=0;i<length;i++){const t=i/sampleRate,n=noise();low+=(n-low)*.13;body+=(n-body)*.38;phase+=2*Math.PI*(kind==='kick'?49+115*Math.exp(-t*95):185)/sampleRate;let value;if(kind==='kick')value=Math.sin(phase)*Math.exp(-t*24)+(n-low)*.22*Math.exp(-t*800);else if(kind==='snare')value=(body-low)*2.6*Math.exp(-t*32)+Math.sin(phase)*.42*Math.exp(-t*48)+(n-low)*.15*Math.exp(-t*180);else value=((n-body)*.55+Math.sin(2*Math.PI*8231*t)*Math.sin(2*Math.PI*6173*t)*.18)*Math.exp(-t*90);data[i]=Math.tanh(value*1.5)*Math.min(1,t/.0006)}kit[kind]=data}return kit}
const drums=drumKit();
class Pulse {
 constructor(d){this.releaseAt=Infinity;this.effectSend=d.effectSend??1;this.age=0;this.phase=0;this.low=0;this.a=0;this.b=0;this.role=d.role||'backing';this.kind=d.kind||'pulse';this.freq=d.freq;this.level=Math.min(.35,Math.max(0,d.level));this.pan=Math.max(-.8,Math.min(.8,d.pan||0));this.start=d.time??currentTime;this.duration=d.duration??(this.kind==='kick'?.22:this.kind==='snare'?.14:this.kind==='hat'?.045:.13);this.panL=Math.sqrt((1-this.pan)/2);this.panR=Math.sqrt((1+this.pan)/2);this.noise=d.noise??.6;this.noiseState=(Math.random()*4294967296)>>>0;this.noiseAmount=Math.min(.6,Math.max(0,this.noise))*.04;this.decay=this.kind==='bell'?this.duration*.36:this.kind==='pulse'?this.duration*.44:Math.max(.015,this.duration*.22);this.sine=0;this.cosine=1;const step=2*Math.PI*this.freq/sampleRate;this.stepSin=Math.sin(step);this.stepCos=Math.cos(step);this.envelope=1;this.envelopeStep=Math.exp(-1/(sampleRate*this.decay));this.overtone=1;this.overtoneStep=Math.exp(-14/sampleRate);this.noiseEnv=1;this.noiseStep=Math.exp(-50/sampleRate);
 // Two gentle low-pass stages; control-rate updates avoid per-sample trig.
 this.expressive=Number.isFinite(d.cutoff);this.cutoff=Math.max(180,Math.min(sampleRate*.2,d.cutoff||3000));
 this.filterA=0;this.filterB=0;this.filterCoefficient=1-Math.exp(-2*Math.PI*this.cutoff/sampleRate);
 this.filterTarget=this.filterCoefficient;this.amp=1;this.ampTarget=1;
 this.ampDepth=Math.max(0,Math.min(.18,d.ampDepth??.1));
 this.modRate=Math.max(.2,Math.min(2,d.modRate??.8));this.modPhase=d.modPhase??0;
}
 shape(signal,t){
  if((this.age&31)===1){
   const motion=Math.sin(2*Math.PI*this.modRate*t+this.modPhase);
   // A bright attack settles into a warmer tail, with gentle breathing.
   const cutoff=Math.max(180,Math.min(sampleRate*.2,this.cutoff*(.65+1.15*this.envelope)*(1+.12*motion)));
   this.filterTarget=1-Math.exp(-2*Math.PI*cutoff/sampleRate);
   this.ampTarget=1-this.ampDepth*.5+this.ampDepth*.5*motion;
  }
  this.filterCoefficient+=(this.filterTarget-this.filterCoefficient)*.02;
  this.amp+=(this.ampTarget-this.amp)*.02;
  this.filterA+=(signal-this.filterA)*this.filterCoefficient;
  this.filterB+=(this.filterA-this.filterB)*this.filterCoefficient;
  return this.filterB*this.amp;
 }
 next(){const t=this.age++/sampleRate;if(this.kind==='bell'){const sine=this.sine*this.stepCos+this.cosine*this.stepSin;this.cosine=this.cosine*this.stepCos-this.sine*this.stepSin;this.sine=sine;this.noiseState=(this.noiseState*1664525+1013904223)>>>0;const n=this.noiseState/2147483648-1;this.low+=(n-this.low)*.16;const signal=sine*.8+2*sine*this.cosine*.12*this.overtone+this.low*this.noiseAmount*this.noiseEnv;const attack=t<.012?t/.012:1,tail=(this.duration-t)/.025,release=1-(this.start+t-this.releaseAt)/.035;let fade=tail<release?tail:release;if(fade>1)fade=1;else if(fade<0)fade=0;const value=(this.expressive?this.shape(signal,t):signal)*attack*this.envelope*this.level*fade;this.envelope*=this.envelopeStep;this.overtone*=this.overtoneStep;this.noiseEnv*=this.noiseStep;return value;}if(drums[this.kind])return (drums[this.kind][this.age-1]||0)*this.level;const n=Math.random()*2-1;this.low+=(n-this.low)*.16;const kind=this.kind;this.phase+=2*Math.PI*(kind==='kick'?48+85*Math.exp(-t*65):this.freq)/sampleRate;
 let signal;
 if(kind==='bass'){const wave=Math.sin(this.phase)+Math.sin(this.phase*1.006)*.35+Math.sin(this.phase*2)*.22+Math.sin(this.phase*3)*.1;signal=Math.tanh(wave*1.5)*.85;}else if(kind==='kick')signal=Math.sin(this.phase);
 else if(kind==='snare')signal=(n-this.low)*.75+Math.sin(this.phase)*.2;
 else if(kind==='hat')signal=n-this.low;
 else if(kind==='bell')signal=Math.sin(this.phase)*.8+Math.sin(this.phase*2)*.12*Math.exp(-t*14)+this.low*.04*Math.exp(-t*50);
 else{const grit=Math.max(.06,Math.min(.25,this.noise));signal=Math.sin(this.phase)*.82+Math.sin(this.phase*2)*.1*Math.exp(-t*16)+this.low*grit*Math.exp(-t*35);}
 const env=Math.min(1,t/.0015)*Math.exp(-t/this.decay);return signal*env*this.level*Math.max(0,Math.min(1,1-(this.start+t-this.releaseAt)/.035));
 }
}
class PulseProcessor extends AudioWorkletProcessor {
 constructor(){super();this.drive=0;this.targetDrive=0;this.tapeL=new Float32Array(sampleRate*2);this.tapeR=new Float32Array(sampleRate*2);this.write=0;this.grains=[];this.duck=1;this.duckUntil=0;this.pulses=[];this.mixL=new Float64Array(128);this.mixR=new Float64Array(128);this.sendL=new Float64Array(128);this.sendR=new Float64Array(128);this.duckBlock=new Float64Array(128);this.port.onmessage=({data:d})=>{if(d.type==='drive'){this.targetDrive=Math.max(0,Math.min(1,d.amount||0));}else if(d.type==='silence'){this.grains=[];this.tapeL.fill(0);this.tapeR.fill(0);this.pulses=[];this.duck=1;this.duckUntil=0;}else if(d.type==='release-role'){this.pulses=this.pulses.filter(p=>p.role!==d.role||p.start<=currentTime);for(const p of this.pulses)if(p.role===d.role)p.releaseAt=currentTime;}else if(d.type==='grain'){if(this.grains.length<3)this.grains.push({start:d.time??currentTime,pos:(this.write-Math.round((d.offset||.1)*sampleRate)+this.tapeL.length)%this.tapeL.length,age:0,length:Math.round(Math.max(.02,Math.min(.08,d.length||.04))*sampleRate),rate:d.rate===-1?-1:1,level:Math.min(.15,Math.max(0,d.level||.1))});}else if(d.type==='tone'||d.type==='percussion'){if(this.pulses.length>=16){const oldest=this.pulses.find(p=>p.releaseAt===Infinity);if(oldest)oldest.releaseAt=currentTime;if(this.pulses.length>=28)return;}if(d.role?.startsWith('loop:')){const ringing=this.pulses.filter(p=>p.role===d.role&&p.releaseAt===Infinity);if(ringing.length>=2)ringing[0].releaseAt=d.time??currentTime;}if(d.monophonic){const at=d.time??currentTime;this.pulses=this.pulses.filter(p=>p.role!==d.role||p.start<=at);for(const p of this.pulses)if(p.role===d.role)p.releaseAt=Math.min(p.releaseAt,at)}if(d.role==='lead')this.duckUntil=currentTime+.17;this.pulses.push(new Pulse(d))}}}
 process(inputs,outputs){
  const out=outputs[0],fx=outputs[1],length=out[0].length;
  // Reuse block buffers; never allocate or filter voice arrays on the audio thread.
  if(this.mixL.length!==length){this.mixL=new Float64Array(length);this.mixR=new Float64Array(length);this.sendL=new Float64Array(length);this.sendR=new Float64Array(length);this.duckBlock=new Float64Array(length)}
  const l=this.mixL,r=this.mixR,sl=this.sendL,sr=this.sendR,duck=this.duckBlock;
  l.fill(0);r.fill(0);if(fx){sl.fill(0);sr.fill(0)}
  for(let i=0;i<length;i++){this.duck+=((currentTime+i/sampleRate<this.duckUntil?.48:1)-this.duck)*.002;duck[i]=this.duck}
  for(const p of this.pulses){
   const begin=Math.max(0,Math.ceil((p.start-currentTime)*sampleRate));
   const end=Math.min(length,begin+Math.max(0,Math.ceil(p.duration*sampleRate-p.age)),Math.ceil((p.releaseAt+.035-currentTime)*sampleRate));
   const backing=p.role!=='lead'&&p.role!=='drums',send=fx&&!drums[p.kind]&&p.effectSend!==0;
   for(let i=begin;i<end;i++){const v=p.next()*(backing?duck[i]:1),vl=v*p.panL,vr=v*p.panR;l[i]+=vl;r[i]+=vr;if(send){sl[i]+=vl*p.effectSend;sr[i]+=vr*p.effectSend}}
  }
  for(let i=0;i<length;i++){
   this.drive+=(this.targetDrive-this.drive)*.002;
   const now=currentTime+i/sampleRate;this.tapeL[this.write]=l[i];this.tapeR[this.write]=r[i];if(++this.write===this.tapeL.length)this.write=0;
   for(const g of this.grains){if(now<g.start||g.age>=g.length)continue;const at=(Math.floor(g.pos)+this.tapeL.length)%this.tapeL.length,env=Math.sin(Math.PI*g.age/g.length)**2;l[i]+=this.tapeL[at]*env*g.level;r[i]+=this.tapeR[at]*env*g.level;g.pos+=g.rate;g.age++}
   if(fx){fx[0][i]=this.distort(sl[i]);if(fx[1])fx[1][i]=this.distort(sr[i])}
   out[0][i]=this.distort(l[i]);for(let c=1;c<out.length;c++)out[c][i]=this.distort(r[i]);
  }
  let count=0;for(const g of this.grains)if(g.age<g.length)this.grains[count++]=g;this.grains.length=count;
  count=0;const endTime=currentTime+length/sampleRate;for(const p of this.pulses)if(p.age/sampleRate<p.duration&&endTime<p.releaseAt+.035)this.pulses[count++]=p;this.pulses.length=count;
  return true;
 }
 saturate(x){if(x>=3)return 1;if(x<=-3)return -1;const x2=x*x;return x*(27+x2)/(27+9*x2)}
 distort(value){const d=this.drive,dry=this.saturate(value),wet=this.saturate(value*(1+d*20))/(1+d*2.8);let v=dry*(1-d)+wet*d;if(d>.65){const steps=2**(12-d*7);v=Math.round(v*steps)/steps}return Math.max(-1,Math.min(1,v))*.7}
}
registerProcessor('relief-pulse',PulseProcessor);
