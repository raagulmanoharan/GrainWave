// Require sustained net travel, not frame-to-frame landmark jitter.
export class MovementGate {
 constructor(){this.reset()}
 reset(){this.history=new Map();this.serial=0}
 update(points,observationTime,now){
  const active=[];
  for(const p of points){
   const time=p.name==='object'?p.time:observationTime;
   let state=this.history.get(p.id);
   if(!state||time-state.time>350){state={x:p.x,y:p.y,anchorX:p.x,anchorY:p.y,anchorTime:time,time,hits:0,eventUntil:0,lastTrigger:-Infinity};this.history.set(p.id,state);continue}
   if(time>state.time){
    const step=Math.hypot(p.x-state.x,p.y-state.y),travel=Math.hypot(p.x-state.anchorX,p.y-state.anchorY);
    state.hits=step>.003?state.hits+1:0;
    const distance=p.name==='object'?.025:.035;
    if(state.hits>=2&&travel>=distance&&time-state.anchorTime>=100&&time-state.lastTrigger>=600){
     state.token=++this.serial;state.eventUntil=time+450;state.lastTrigger=time;
     state.anchorX=p.x;state.anchorY=p.y;state.anchorTime=time;state.hits=0;
    }else if(time-state.anchorTime>450){state.anchorX=p.x;state.anchorY=p.y;state.anchorTime=time;state.hits=0}
    if(step<=.003)state.eventUntil=0;
    state.x=p.x;state.y=p.y;state.time=time;
   }
   if(state.eventUntil>now&&now-state.time<180)active.push({...p,movementToken:state.token});
  }
  for(const [id,state] of this.history)if(now-state.time>1000)this.history.delete(id);
  return active;
 }
}
// One note per movement event, at most one onset per eighth-note interval.
export class SparseNotes {
 constructor(){this.used=new Map();this.lastTick=-Infinity;this.lastPitch=null}
 select(notes,tick){const output=notes.map(()=>null);if(tick-this.lastTick<2)return output;
  const choices=notes.map((note,i)=>({note,i})).filter(({note})=>note&&note.point?.movementToken&&this.used.get(note.id)!==note.point.movementToken);
  if(!choices.length)return output;
  choices.sort((a,b)=>this.lastPitch===null?a.i-b.i:Math.abs(a.note.midi-this.lastPitch)-Math.abs(b.note.midi-this.lastPitch));
  const {note,i}=choices[0];let midi=note.midi;
  if(this.lastPitch!==null){while(midi-this.lastPitch>7)midi-=12;while(this.lastPitch-midi>7)midi+=12}
  output[i]={...note,midi};this.used.set(note.id,note.point.movementToken);this.lastTick=tick;this.lastPitch=midi;
  return output;
 }
}
