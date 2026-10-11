// Slow A-minor voicings: no beat grid, drums or bass sequence.
export class AmbientBed{
 constructor(ctx,output){this.ctx=ctx;this.next=Infinity;this.voices=[];this.bus=ctx.createGain();this.bus.gain.value=0;this.bus.connect(output);
  const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1700;this.filter=filter;filter.connect(this.bus);
  const reverb=ctx.createConvolver(),buffer=ctx.createBuffer(2,ctx.sampleRate*7,ctx.sampleRate);for(let c=0;c<2;c++){const a=buffer.getChannelData(c);let low=0;for(let i=0;i<a.length;i++){low+=(Math.random()*2-1-low)*.12;a[i]=low*Math.exp(-i/(ctx.sampleRate*1.8))}}reverb.buffer=buffer;
  const wet=ctx.createGain();wet.gain.value=.85;filter.connect(reverb);reverb.connect(wet);wet.connect(this.bus);
  const delay=ctx.createDelay(3),feedback=ctx.createGain(),damp=ctx.createBiquadFilter(),echo=ctx.createGain();delay.delayTime.value=1.37;feedback.gain.value=.56;damp.type='lowpass';damp.frequency.value=950;echo.gain.value=.42;filter.connect(delay);delay.connect(damp);damp.connect(feedback);feedback.connect(delay);delay.connect(echo);echo.connect(this.bus);
  this.lfo=ctx.createOscillator();const depth=ctx.createGain();this.lfo.frequency.value=.035;depth.gain.value=650;this.lfo.connect(depth);depth.connect(filter.frequency);this.lfo.start();
 }
 start(){this.bus.gain.cancelScheduledValues(this.ctx.currentTime);this.bus.gain.setTargetAtTime(.65,this.ctx.currentTime,1.5);this.next=this.ctx.currentTime;this.advance()}
 stop(){this.bus.gain.setTargetAtTime(0,this.ctx.currentTime,.3);this.next=Infinity;for(const voice of this.voices){try{voice.stop(this.ctx.currentTime+.5)}catch{}}this.voices=[]}
 advance(){const now=this.ctx.currentTime;if(now<this.next)return;this.next=now+12+Math.random()*6;
  const voicings=[[45,52,60,64,71],[45,55,62,64,69],[45,52,59,62,72]],chord=voicings[Math.floor(Math.random()*voicings.length)];
  chord.forEach((midi,i)=>{const gain=this.ctx.createGain(),pan=this.ctx.createStereoPanner();gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.025,now+3+i*.22);gain.gain.exponentialRampToValueAtTime(.0001,now+20);pan.pan.value=(i-2)*.28;gain.connect(pan);pan.connect(this.filter);
   [-5,5].forEach(detune=>{const osc=this.ctx.createOscillator();osc.type=i===0?'sine':'triangle';osc.frequency.value=440*2**((midi-69)/12);osc.detune.value=detune;osc.connect(gain);osc.start(now);osc.stop(now+21);this.voices.push(osc);osc.onended=()=>{this.voices=this.voices.filter(v=>v!==osc);osc.disconnect();if(!this.voices.some(v=>v.__gain===gain)){gain.disconnect();pan.disconnect()}};osc.__gain=gain})
  })
 }
}
