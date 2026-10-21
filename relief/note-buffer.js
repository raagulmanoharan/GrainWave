// Independent performance-time clock: retains pitches and irregular trigger spacing.
export class NoteBuffer {
 constructor(){this.notes=[];this.locked=null;this.index=0;this.origin=null;this.duration=0}
 record(note){this.notes.push({...note,point:{...note.point}});if(this.notes.length>16)this.notes.shift()}
 toggle(time){
  if(this.locked){this.locked=null;return false}
  if(!this.notes.length)return false;
  const first=this.notes[0].time;
  this.locked=this.notes.map(n=>({...n,point:{...n.point},offset:n.time-first}));
  this.duration=Math.max(85,time-first,this.locked.at(-1).offset+85);
  this.index=0;this.origin=time;return true;
 }
 progress(time){return this.locked?((Math.max(0,time-this.origin)%this.duration)/this.duration):0}
 due(until){
  if(!this.locked)return [];
  const result=[];
  // Bound catch-up after a stalled browser; do not burst a backlog of old notes.
  const cycle=Math.floor((until-this.origin)/this.duration);
  if(cycle>Math.floor(this.index/this.locked.length)+1)this.index=cycle*this.locked.length;
  for(let n=0;n<32;n++){
   const event=this.locked[this.index%this.locked.length];
   const at=this.origin+Math.floor(this.index/this.locked.length)*this.duration+event.offset;
   if(at>until)break;
   result.push({...event,at});this.index++;
  }
  return result;
 }
}

// Four independent performance clocks, sharing only the live capture buffer.
export class LoopRack {
 constructor(){this.buffer=new NoteBuffer();this.loops=[];this.selected=null;this.nextId=1}
 get notes(){return this.buffer.notes}
 get locked(){return this.loops.length?this.loops.flatMap(l=>l.clock.locked.map(n=>({...n,midi:n.midi+l.octave}))):null}
 get origin(){return this.loops[0]?.clock.origin??0}
 get duration(){return this.loops[0]?.clock.duration??1}
 set locked(value){if(value===null){this.loops=[];this.selected=null;this.nextId=1}}
 record(note){this.buffer.record(note)}
 capture(time,echo=false){if(this.loops.length>=4||!this.notes.length)return null;const clock=new NoteBuffer();clock.notes=this.notes.map(n=>({...n}));clock.toggle(time);const loop={id:this.nextId++,clock,baseDuration:clock.duration,baseOffsets:clock.locked.map(n=>n.offset),speed:1,octave:0,echo,paused:false,phase:0};this.loops.push(loop);this.buffer.notes=[];this.selected=loop.id;return loop}
 get selection(){return this.loops.find(l=>l.id===this.selected)}
 harmony(time){return this.loops.filter(l=>!l.paused).flatMap(l=>{const phase=l.clock.progress(time)*l.clock.duration;return l.clock.locked.map(n=>({...n,midi:n.midi+l.octave,offset:-((phase-n.offset+l.clock.duration)%l.clock.duration)}))})}
 progress(time){const l=this.selection||this.loops[0];return l?(l.paused?l.phase:l.clock.progress(time)):0}
 due(until){return this.loops.flatMap(l=>l.paused?[]:l.clock.due(until).map(n=>({...n,midi:n.midi+l.octave,loopId:l.id,echo:l.echo}))).sort((a,b)=>a.at-b.at)}
 rephase(loop,phase,time){const c=loop.clock;c.duration=loop.baseDuration/loop.speed;c.locked.forEach((n,i)=>n.offset=loop.baseOffsets[i]/loop.speed);c.origin=time-phase*c.duration;c.index=c.locked.findIndex(n=>n.offset>=phase*c.duration);if(c.index<0)c.index=c.locked.length}
 togglePause(time){const l=this.selection;if(!l)return;l.phase=l.paused?l.phase:l.clock.progress(time);l.paused=!l.paused;if(!l.paused)this.rephase(l,l.phase,time);return l}
 speed(factor,time){const l=this.selection;if(!l)return;const phase=l.paused?l.phase:l.clock.progress(time);l.speed=Math.max(.25,Math.min(4,l.speed*factor));this.rephase(l,phase,time);return l}
 transpose(semitones){const l=this.selection;if(!l)return;l.octave=Math.max(-24,Math.min(24,l.octave+semitones));return l}
}
