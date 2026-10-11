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
