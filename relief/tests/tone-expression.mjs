import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../pulse-worklet.js',import.meta.url),'utf8');
for(const rate of [32000,48000]){
 const scope={sampleRate:rate,currentTime:0,AudioWorkletProcessor:class{constructor(){this.port={}}},registerProcessor(){}};
 vm.createContext(scope);vm.runInContext(source+';globalThis.Voice=Pulse;globalThis.Processor=PulseProcessor;',scope);
 const render=options=>{const voice=new scope.Voice({kind:'bell',role:'lead',freq:880,level:.2,duration:2,noise:0,...options});const data=Float64Array.from({length:rate*2},()=>voice.next());assert(data.every(Number.isFinite));return data};
 const rms=(data,start,end)=>Math.sqrt(data.slice(start*rate,end*rate).reduce((s,x)=>s+x*x,0)/((end-start)*rate));
 const dark=render({cutoff:450,ampDepth:0}),bright=render({cutoff:5000,ampDepth:0});
 assert(rms(bright,.05,.25)>rms(dark,.05,.25)*1.5,'Cutoff must audibly change tone');
 const steady=render({cutoff:2500,ampDepth:0,modRate:1,modPhase:0}),breathing=render({cutoff:2500,ampDepth:.18,modRate:1,modPhase:0});
 const early=rms(breathing,.15,.25)/rms(steady,.15,.25),late=rms(breathing,.65,.75)/rms(steady,.65,.75);
 assert(early>late+.08,'Amplitude breathes across each note');
 assert.equal(breathing[0],0,'Attack begins silently');
 assert(Math.abs(breathing.at(-1))<.0001,'Tail ends smoothly');
 const processor=new scope.Processor();
 for(let i=0;i<40;i++)processor.port.onmessage({data:{type:'tone',kind:'bell',freq:220+i*30,level:.2,cutoff:1500,ampDepth:.14}});
 assert(processor.pulses.length<=28);
 for(let i=0;i<40;i++){scope.currentTime=i*128/rate;const out=[new Float32Array(128),new Float32Array(128)];processor.process([], [out]);assert(out.every(ch=>ch.every(x=>Number.isFinite(x)&&Math.abs(x)<=.7)))}
 processor.port.onmessage({data:{type:'silence'}});assert.equal(processor.pulses.length,0);
}
console.log('32/48kHz: audible cutoff, amplitude movement, smooth envelopes and bounded polyphony passed');
