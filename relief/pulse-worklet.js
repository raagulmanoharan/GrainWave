// Short tuned noise resonators and compact breakbeat percussion. No sustained voice.
class Pulse {
 constructor(d){this.age=0;this.phase=0;this.low=0;this.a=0;this.b=0;this.role=d.role||'backing';this.kind=d.kind||'pulse';this.freq=d.freq;this.level=Math.min(.35,Math.max(0,d.level));this.pan=Math.max(-.8,Math.min(.8,d.pan||0));this.start=d.time??currentTime;this.duration=d.duration??(this.kind==='kick'?.22:this.kind==='snare'?.14:this.kind==='hat'?.045:.13);this.noise=d.noise??.6;this.decay=this.kind==='bell'?.1:this.kind==='pulse'?.07:Math.max(.015,this.duration*.22)}
 next(){const t=this.age++/sampleRate,n=Math.random()*2-1;this.low+=(n-this.low)*.16;const kind=this.kind;this.phase+=2*Math.PI*(kind==='kick'?48+85*Math.exp(-t*65):this.freq)/sampleRate;
 let signal;
 if(kind==='kick'||kind==='bass')signal=Math.sin(this.phase)+(kind==='bass'?Math.sin(this.phase*2)*.15:0);
 else if(kind==='snare')signal=(n-this.low)*.75+Math.sin(this.phase)*.2;
 else if(kind==='hat')signal=n-this.low;
 else if(kind==='bell')signal=Math.sin(this.phase)*.8+Math.sin(this.phase*2)*.12*Math.exp(-t*14)+this.low*.04*Math.exp(-t*50);
 else{const grit=Math.max(.06,Math.min(.25,this.noise));signal=Math.sin(this.phase)*.82+Math.sin(this.phase*2)*.1*Math.exp(-t*16)+this.low*grit*Math.exp(-t*90);}
 const env=Math.min(1,t/.0015)*Math.exp(-t/this.decay);return signal*env*this.level;
 }
}
class PulseProcessor extends AudioWorkletProcessor {
 constructor(){super();this.duck=1;this.duckUntil=0;this.pulses=[];this.port.onmessage=({data:d})=>{if(d.type==='silence'){this.pulses=[];this.duck=1;this.duckUntil=0;}else if(d.type==='tone'||d.type==='percussion'){if(this.pulses.length>=32)this.pulses.shift();if(d.role==='lead')this.duckUntil=currentTime+.17;this.pulses.push(new Pulse(d))}}}
 process(inputs,outputs){const out=outputs[0];for(let i=0;i<out[0].length;i++){const now=currentTime+i/sampleRate;this.duck+=((now<this.duckUntil?.48:1)-this.duck)*.002;let l=0,r=0;for(const p of this.pulses){if(currentTime+i/sampleRate<p.start)continue;const v=p.next()*(p.role==='lead'?1:this.duck);l+=v*Math.sqrt((1-p.pan)/2);r+=v*Math.sqrt((1+p.pan)/2)}out[0][i]=Math.tanh(l)*.7;for(let c=1;c<out.length;c++)out[c][i]=Math.tanh(r)*.7}this.pulses=this.pulses.filter(p=>p.age/sampleRate<p.duration);return true}
}
registerProcessor('relief-pulse',PulseProcessor);
