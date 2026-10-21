// Continuous expression from measured source travel, with sensor-jitter rejection.
export class MotionExpression {
 constructor(){this.reset()}
 reset(){this.active=new Map();this.history=new Map();this.level=0;this.energy=0;this.lastMotion=-Infinity;this.lastFrame=null;this.point={x:.5,y:.5};this.direction=0;this.revision=0;this.consumed=0}
 // OpenCV already supplies camera-compensated travel and stable region IDs.
 observe(points,now,{uncertain=false,sensitivity=.5}={}){
  if(uncertain){this.history.clear();this.active.clear();this.energy=0;this.lastMotion=-Infinity;this.consumed=this.revision;return}
  let strongest=0;
  for(const p of points){
   if(!p.confirmed||![p.time,p.dx,p.dy].every(Number.isFinite)||now-p.time>300)continue;
   const old=this.history.get(p.id);if(old!==undefined&&p.time<=old)continue;
   this.history.set(p.id,p.time);
   const dt=Math.max(.03,(p.interval||60)/1000),travel=Math.hypot(p.dx,p.dy);
   if(travel<.0007||travel/dt<.004)continue;
   const energy=Math.min(1,Math.max(0,travel/dt-.004)*(5+sensitivity*9));
   if(energy>.02)this.active.set(p.id,now+180);
   if(energy>strongest){strongest=energy;this.point={...p};this.direction=p.dy}
  }
  if(strongest>.02){this.energy=strongest;this.lastMotion=now;this.revision++}
  for(const [id,time] of this.history)if(now-time>500)this.history.delete(id);
  for(const [id,until] of this.active)if(now>until)this.active.delete(id);
 }
 advance(now,{release=.56}={}){
  const dt=this.lastFrame===null?.016:Math.min(.1,Math.max(0,(now-this.lastFrame)/1000));this.lastFrame=now;
  const moving=now-this.lastMotion<220,target=moving?this.energy:0;
  this.level+=(target-this.level)*(1-Math.exp(-dt/(target>this.level?.015:Math.max(.05,release*.5))));
  const note=moving&&this.revision!==this.consumed;if(note)this.consumed=this.revision;
  return {level:this.level,moving,note,point:this.point,direction:this.direction};
 }
}
