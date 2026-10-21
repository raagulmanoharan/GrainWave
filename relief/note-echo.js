// Bounded audio-time scheduling: original note plus three fading repeats.
// Echoes never enter the recording buffer or generate further echoes.
export class NoteEcho {
 constructor(){this.pending=[]}
 add(tone,spacing){
  for(let repeat=1;repeat<=3;repeat++)this.pending.push({...tone,role:'echo:'+tone.role,monophonic:false,time:tone.time+spacing*repeat,level:tone.level*Math.pow(.48,repeat)});
  this.pending.sort((a,b)=>a.time-b.time);
  if(this.pending.length>192)this.pending.length=192;
 }
 due(now){
  const ready=[];this.pending=this.pending.filter(tone=>{
   if(tone.time>now+.08)return true;
   if(tone.time>=now-.1)ready.push(tone);
   return false;
  });return ready;
 }
 cancel(role){this.pending=this.pending.filter(tone=>tone.role!=='echo:'+role)}
 clear(){this.pending=[]}
}
