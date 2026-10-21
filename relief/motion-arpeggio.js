export const NOTE_GAP=450;
const scale=Array.from({length:109},(_,m)=>m).filter(m=>m>=45&&[0,2,4,7,9].includes(m%12));
export class MotionArpeggio{
 constructor(){this.reset()}
 reset(){this.history=[];this.until=0;this.lastBurst=-Infinity;this.turn=0}
 busy(time){return time<this.until}
 plan({time,midi,point,level,sources}){this.history=this.history.filter(e=>time-e.time<2400);this.history.push({time,point});const clustered=this.history.filter(e=>Math.hypot(e.point.x-point.x,e.point.y-point.y)<.08).length>=4;
 if(time-this.lastBurst<2400||!(level>.8||sources>=4||clustered))return [];
 this.lastBurst=time;const count=level>.92||sources>=6?3:2,step=NOTE_GAP,index=scale.reduce((best,m,i)=>Math.abs(m-midi)<Math.abs(scale[best]-midi)?i:best,0),up=this.turn++%2===0;
 const result=Array.from({length:count-1},(_,i)=>({midi:scale[Math.max(0,Math.min(scale.length-1,index+(up?1:-1)*(i+1)))],at:time+step*(i+1),point,velocity:level}));this.until=result.at(-1).at+NOTE_GAP;return result}
}
