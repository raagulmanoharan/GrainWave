// Motion controls density; a short guard only prevents accidental double hits.
export const MIN_NOTE_GAP=100;
export const motionNoteGap=level=>380-260*Math.max(0,Math.min(1,level));
const scale=Array.from({length:109},(_,m)=>m).filter(m=>m>=45&&[0,2,4,7,9].includes(m%12));
export class MotionArpeggio{
 constructor(){this.reset()}
 reset(){this.history=[];this.until=0;this.lastBurst=-Infinity;this.turn=0}
 busy(time){return time<this.until}
 plan({time,midi,point,level,sources}){this.history=this.history.filter(e=>time-e.time<1200);this.history.push({time,point});const clustered=this.history.filter(e=>Math.hypot(e.point.x-point.x,e.point.y-point.y)<.08).length>=4;
 if(time-this.lastBurst<900+motionNoteGap(level)*2||!(level>.8||sources>=4||clustered))return [];
 this.lastBurst=time;const count=level>.92||sources>=6?3:2,step=motionNoteGap(level)*1.15,index=scale.reduce((best,m,i)=>Math.abs(m-midi)<Math.abs(scale[best]-midi)?i:best,0),up=this.turn++%2===0;
 const result=Array.from({length:count-1},(_,i)=>({midi:scale[Math.max(0,Math.min(scale.length-1,index+(up?1:-1)*(i+1)))],at:time+step*(i===0?1:1.85),point,velocity:level}));this.until=result.at(-1).at+MIN_NOTE_GAP;return result}
}
