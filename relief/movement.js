// Deliberate net travel earns a discrete event. Timing never depends on
// an expiring motion window or an invisible per-source cooldown.
export class MovementGate {
 constructor(){this.serial=0;this.reset()}
 reset(){this.history=new Map();this.sources=[]}
 update(points,observationTime,now,{distance=.035,cameraOffset={x:0,y:0},uncertain=false}={}){
  const events=[];this.sources=[];
  if(uncertain){this.history.clear();return events}
  for(const p of points){
   const time=p.name==='object'?p.time:observationTime;
   if(!Number.isFinite(time)||now-time>350)continue;
   const x=p.x-cameraOffset.x,y=p.y-cameraOffset.y;
   let s=this.history.get(p.id);
   if(!s||time-s.time>700){s={x,y,anchorX:x,anchorY:y,time,samples:1,path:0,progress:0};this.history.set(p.id,s)}
   else if(time>s.time){
    const previousX=s.x,previousY=s.y;s.x+=(x-s.x)*.5;s.y+=(y-s.y)*.5;s.samples++;s.time=time;
    s.path+=Math.hypot(s.x-previousX,s.y-previousY);
    const travel=Math.hypot(s.x-s.anchorX,s.y-s.anchorY);
    s.progress=Math.min(.99,travel/distance)*Math.min(1,travel/Math.max(.00001,s.path)/.55);
    if(s.samples>=3&&travel>=distance&&travel/(s.path||1)>=.55){
     events.push({...p,movementToken:++this.serial,gestureDirection:s.y-s.anchorY,gestureTravel:travel});
     s.anchorX=s.x;s.anchorY=s.y;s.path=0;s.samples=1;s.progress=0;s.flashUntil=now+280;
    }
    // Oscillation is noise, not a gesture. Re-anchor after clearly incoherent travel.
    if(s.path>distance*4&&travel<s.path*.3){s.anchorX=s.x;s.anchorY=s.y;s.path=0;s.samples=1;s.progress=0}
   }
   this.sources.push({...p,progress:s.progress,flashUntil:s.flashUntil||0});
  }
  for(const [id,s] of this.history)if(now-s.time>1200)this.history.delete(id);
  return events;
 }
}
// Durable, bounded gesture queue: a completed action gets one audible reply.
// Co-occurring fingers contribute one lead onset, rather than five queued notes.
export class SparseNotes {
 constructor(){this.reset()}
 reset(){this.used=new Map();this.pending=[];this.lastTick=-Infinity}
 enqueue(notes){
  const choices=notes.map((note,i)=>({note,i})).filter(({note})=>note?.point?.movementToken&&this.used.get(note.id)!==note.point.movementToken);
  if(!choices.length)return;
  for(const {note} of choices)this.used.set(note.id,note.point.movementToken);
  choices.sort((a,b)=>(b.note.point.gestureTravel||0)-(a.note.point.gestureTravel||0)||a.i-b.i);
  // Keep only the most recent unplayed gesture; no backlog after fast movement.
  this.pending=[choices[0]];
 }
 select(notes,tick,{spacing=4}={}){
  this.enqueue(notes);const output=notes.map(()=>null);
  if(tick%spacing!==0||tick-this.lastTick<spacing||!this.pending.length)return output;
  const {note,i}=this.pending.shift();if(i>=output.length)return output;
  output[i]=note;this.lastTick=tick;return output;
 }
}
