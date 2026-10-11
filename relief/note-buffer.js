// Capture actual played pitches, never the generated template or loop playback.
export class NoteBuffer {
 constructor(){this.notes=[];this.locked=null;this.index=0;this.origin=null}
 record(note){if(this.locked)return;this.notes.push({...note,point:{...note.point}});if(this.notes.length>16)this.notes.shift()}
 toggle(){if(this.locked){this.locked=null;return false}if(!this.notes.length)return false;this.locked=this.notes.map(n=>({...n,point:{...n.point}}));this.index=0;this.origin=null;return true}
 event(step){if(!this.locked)return null;if(this.origin===null)this.origin=step;if((step-this.origin)%2)return null;return this.locked[this.index++%this.locked.length]}
}
