// Short tuned noise resonators and compact breakbeat percussion. No sustained voice.
class Pulse {
 constructor(d){this.age=0;this.phase=0;this.low=0;this.a=0;this.b=0;this.kind=d.kind||'pulse';this.freq=d.freq;this.level=Math.min(.35,Math.max(0,d.level));this.pan=Math.max(-.8,Math.min(.8,d.pan||0));this.start=d.time??currentTime;this.duration=d.duration??(this.kind==='kick'?.22:this.kind==='snare'?.14:this.kind==='hat'?.045:.13);this.noise=d.noise??.6;this.decay=this.kind==='bell'?.16:Math.max(.015,this.duration*.22)}
 next(){const t=this.age++/sampleRate,n=Math.random()*2-1;this.low+=(n-this.low)*.16;const kind=this.kind;this.phase+=2*Math.PI*(kind==='kick'?48+85*Math.exp(-t*65):this.freq)/sampleRate;
 let signal;
 if(kind==='kick'||kind==='bass')signal=Math.sin(this.phase)+(kind==='bass'?Math.sin(this.phase*2)*.15:0);
 else if(kind==='snare')signal=(n-this.low)*.75+Math.sin(this.phase)*.2;
 else if(kind==='hat')signal=n-this.low;
 else if(kind==='bell')signal=Math.sin(this.phase)*.65+Math.sin(this.phase*2.01)*.22*Math.exp(-t*8)+Math.sin(this.phase*3.97)*.1*Math.exp(-t*20);
 else{const r=.985,excite=t<.012?n*.12:0,next=excite+2*r*Math.cos(2*Math.PI*this.freq/sampleRate)*this.a-r*r*this.b;this.b=this.a;this.a=next;signal=Math.tanh(next*3)*this.noise+Math.sin(this.phase)*(1-this.noise);}
 const env=Math.min(1,t/.0015)*Math.exp(-t/this.decay);return signal*env*this.level;
 }
}
class PulseProcessor extends AudioWorkletProcessor {
 constructor(){super();this.pulses=[];this.port.onmessage=({data:d})=>{if(d.type==='silence')this.pulses=[];else if(d.type==='tone'||d.type==='percussion'){if(this.pulses.length>=32)this.pulses.shift();this.pulses.push(new Pulse(d))}}}
 process(inputs,outputs){const out=outputs[0];for(let i=0;i<out[0].length;i++){let l=0,r=0;for(const p of this.pulses){if(currentTime+i/sampleRate<p.start)continue;const v=p.next();l+=v*Math.sqrt((1-p.pan)/2);r+=v*Math.sqrt((1+p.pan)/2)}out[0][i]=Math.tanh(l)*.7;for(let c=1;c<out.length;c++)out[c][i]=Math.tanh(r)*.7}this.pulses=this.pulses.filter(p=>p.age/sampleRate<p.duration);return true}
}
registerProcessor('relief-pulse',PulseProcessor);
