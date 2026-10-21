// Smooth OpenCV region positions for drawing; this does not detect motion.
import {pitch} from './music.js';
const clamp=v=>Math.max(0,Math.min(1,v));
export class PointTracker{
 constructor(){this.previous=new Map()}
 reset(){this.previous.clear()}
 update(input,time,scale,limit=10){const used=new Set(),output=[];for(const p of input.slice(0,limit)){const id=p.id;if(!id)continue;used.add(id);const old=this.previous.get(id),x=old?old.x+(p.x-old.x)*.45:p.x,y=old?old.y+(p.y-old.y)*.45:p.y;const midi=old&&Math.abs(y-old.pitchY)<.018?old.midi:pitch(clamp(y),scale,1);const next={...p,id,x:clamp(x),y:clamp(y),midi,pitchY:midi===old?.midi?old.pitchY:y,time,scale};if(old&&old.scale!==scale){next.midi=pitch(y,scale,1);next.pitchY=y}this.previous.set(id,next);output.push(next)}for(const [id,p] of this.previous){if(!used.has(id)){if(time-p.time<100&&p.scale===scale)output.push(p);else this.previous.delete(id)}}return output.slice(0,limit)}
}
