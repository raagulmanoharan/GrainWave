export const palette=[57,60,62,64,67,69];
export function pulsePitch(y){return palette[Math.min(palette.length-1,Math.floor(Math.max(0,Math.min(1,1-y))*palette.length))]}
export function idleTexture(time,lastMotion){return Math.max(0,Math.min(1,(time-lastMotion-2000)/3000))}
export class MotifSong {
 constructor(){this.motif=[57,62,64,60];this.pending=[];this.lastSlot=-1;this.seeded=false;this.learned=false;this.lastCommit=-128;this.replace=0;this.stopStep=-1;this.energy=.3}
 learn(midi,step,slot){
  if(!palette.includes(midi))return;if(!this.seeded){this.motif=[midi,midi,midi,midi];this.seeded=true}this.stopStep=Math.ceil((step+1)/32)*32;
  if(slot===this.lastSlot)return;this.lastSlot=slot;
  if(this.pending.at(-1)!==midi)this.pending.push(midi);if(this.pending.length>4)this.pending.shift();
 }
 events(step,energy,{loop=false}={}){
  if(step%32===0&&this.pending.length===4&&(!this.learned||step-this.lastCommit>=128)){
   if(!this.learned){this.motif=[...this.pending];this.learned=true}else{this.motif[this.replace%4]=this.pending[this.replace%4];this.replace++}
   this.lastCommit=step;this.pending=[];
  }
  if(!this.seeded)return [];
  this.energy=Math.max(energy,this.energy*.985);
  const idle=energy<=.02,gain=idle?.6:1;if(idle&&!loop)return [];
  return arrangementStep(step,{energy:this.energy,motif:this.motif}).filter(e=>!idle||e.kind==='bell'||e.kind==='bass').map(e=>({...e,level:e.level*gain*.42}));
 }
}
export function arrangementStep(step,{energy=.3,motif=[57,62,64,60]}={}){
 const i=step%16,bar=Math.floor(step/16),events=[],hit=(kind,level,freq)=>events.push({type:'percussion',kind,level,freq,offset:kind==='hat'&&i%4===2?.008:0});
 if([0,6,10].includes(i)||(bar%4===3&&i===14))hit('kick',.19,55);
 if(i===4||i===12)hit('snare',.12,180);
 if(i%2===0)hit('hat',i%4===2?.04:.025,6000);
 if(bar%4===3&&i===11&&energy>.4)hit('snare',.035,180);
 if(i===0||i===8)events.push({type:'tone',kind:'bass',midi:bar%8===7?40:45,level:.11,duration:.15});
 const slots=[0,4,6,10],index=slots.indexOf(i);
 if(index>=0)events.push({type:'tone',kind:'bell',midi:motif[index],level:.055,duration:.28,pan:-.25});
 const shift=2+Math.floor(bar/8)%3,other=slots.indexOf((i-shift+16)%16);
 if(other>=0&&bar>=2&&bar%2===1)events.push({type:'tone',kind:'bell',midi:motif[other],level:.022,duration:.25,pan:.3});
 if(bar%8>=4&&i===14)events.push({type:'tone',kind:'bell',midi:motif[2],level:.016,duration:.22,pan:.1});
 return events;
}
