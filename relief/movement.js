// Landmark inference alone is not movement. Compare distinct observations,
// rejecting subpixel jitter and expiring evidence between camera results.
export class MovementGate {
 constructor(){this.reset()}
 reset(){this.history=new Map()}
 update(points,observationTime,now){
  const active=[];
  for(const p of points){
   const old=this.history.get(p.id);
   if(!old||observationTime-old.time>350){this.history.set(p.id,{x:p.x,y:p.y,time:observationTime,moving:false});continue}
   if(observationTime>old.time){
    const moving=Math.hypot(p.x-old.x,p.y-old.y)>.008;
    this.history.set(p.id,{x:p.x,y:p.y,time:observationTime,moving});
   }
   const state=this.history.get(p.id);
   if(state.moving&&now-state.time<180)active.push(p);
  }
  for(const [id,state] of this.history)if(now-state.time>500)this.history.delete(id);
  return active;
 }
}
