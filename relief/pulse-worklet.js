// Short tuned noise resonators and compact breakbeat percussion. No sustained voice.
class Pulse {
 constructor(d){this.age=0;this.phase=0;this.low=0;this.a=0;this.b=0;this.role=d.role||'backing';this.kind=d.kind||'pulse';this.freq=d.freq;this.level=Math.min(.35,Math.max(0,d.level));this.pan=Math.max(-.8,Math.min(.8,d.pan||0));this.start=d.time??currentTime;this.duration=d.duration??(this.kind==='kick'?.22:this.kind==='snare'?.14:this.kind==='hat'?.045:.13);this.noise=d.noise??.6;this.decay=this.kind==='bell'?this.duration*.36:this.kind==='pulse'?this.duration*.44:Math.max(.015,this.duration*.22)}
 next(){const t=this.age++/sampleRate,n=Math.random()*2-1;this.low+=(n-this.low)*.16;const kind=this.kind;this.phase+=2*Math.PI*(kind==='kick'?48+85*Math.exp(-t*65):this.freq)/sampleRate;
 let signal;
 if(kind==='kick'||kind==='bass')signal=Math.sin(this.phase)+(kind==='bass'?Math.sin(this.phase*2)*.15:0);
 else if(kind==='snare')signal=(n-this.low)*.75+Math.sin(this.phase)*.2;
 else if(kind==='hat')signal=n-this.low;
 else if(kind==='bell')signal=Math.sin(this.phase)*.8+Math.sin(this.phase*2)*.12*Math.exp(-t*14)+this.low*.04*Math.exp(-t*50);
 else{const grit=Math.max(.06,Math.min(.25,this.noise));signal=Math.sin(this.phase)*.82+Math.sin(this.phase*2)*.1*Math.exp(-t*16)+this.low*grit*Math.exp(-t*35);}
 const env=Math.min(1,t/.0015)*Math.exp(-t/this.decay);return signal*env*this.level;
 }
}
class PulseProcessor extends AudioWorkletProcessor {
 constructor(){super();this.drive=0;this.targetDrive=0;this.tapeL=new Float32Array(sampleRate*2);this.tapeR=new Float32Array(sampleRate*2);this.write=0;this.grains=[];this.duck=1;this.duckUntil=0;this.pulses=[];this.port.onmessage=({data:d})=>{if(d.type==='drive'){this.targetDrive=Math.max(0,Math.min(1,d.amount||0));}else if(d.type==='silence'){this.grains=[];this.tapeL.fill(0);this.tapeR.fill(0);this.pulses=[];this.duck=1;this.duckUntil=0;}else if(d.type==='grain'){if(this.grains.length<3)this.grains.push({start:d.time??currentTime,pos:(this.write-Math.round((d.offset||.1)*sampleRate)+this.tapeL.length)%this.tapeL.length,age:0,length:Math.round(Math.max(.02,Math.min(.08,d.length||.04))*sampleRate),rate:d.rate===-1?-1:1,level:Math.min(.15,Math.max(0,d.level||.1))});}else if(d.type==='tone'||d.type==='percussion'){if(this.pulses.length>=32)this.pulses.shift();if(d.role==='lead')this.duckUntil=currentTime+.17;this.pulses.push(new Pulse(d))}}}
 process(inputs,outputs){const out=outputs[0];for(let i=0;i<out[0].length;i++){this.drive+=(this.targetDrive-this.drive)*.002;const now=currentTime+i/sampleRate;this.duck+=((now<this.duckUntil?.48:1)-this.duck)*.002;let l=0,r=0;for(const p of this.pulses){if(currentTime+i/sampleRate<p.start)continue;const v=p.next()*(p.role==='lead'?1:this.duck);l+=v*Math.sqrt((1-p.pan)/2);r+=v*Math.sqrt((1+p.pan)/2)}this.tapeL[this.write]=l;this.tapeR[this.write]=r;this.write=(this.write+1)%this.tapeL.length;for(const g of this.grains){if(now<g.start||g.age>=g.length)continue;const at=(Math.floor(g.pos)+this.tapeL.length)%this.tapeL.length,env=Math.sin(Math.PI*g.age/g.length)**2;l+=this.tapeL[at]*env*g.level;r+=this.tapeR[at]*env*g.level;g.pos+=g.rate;g.age++}out[0][i]=this.distort(l);for(let c=1;c<out.length;c++)out[c][i]=this.distort(r)}this.grains=this.grains.filter(g=>g.age<g.length);this.pulses=this.pulses.filter(p=>p.age/sampleRate<p.duration);return true}
 distort(value){const d=this.drive,dry=Math.tanh(value),wet=Math.tanh(value*(1+d*20))/(1+d*2.8);let v=dry*(1-d)+wet*d;if(d>.65){const steps=2**(12-d*7);v=Math.round(v*steps)/steps}return Math.max(-1,Math.min(1,v))*.7}
}
registerProcessor('relief-pulse',PulseProcessor);
