// Continuous expression from measured source travel, with sensor-jitter rejection.
export class MotionExpression {
 constructor(){this.reset()}
 reset(){this.active=new Map();this.history=new Map();this.level=0;this.energy=0;this.lastMotion=-Infinity;this.lastFrame=null;this.point={x:.5,y:.5};this.direction=0;this.revision=0;this.consumed=0}
 observe(points,handTime,now,{cameraOffset={x:0,y:0},uncertain=false,sensitivity=.5}={}){
  if(uncertain){this.history.clear();this.active.clear();this.energy=0;return}
  let strongest=0;
  for(const p of points){const time=p.name==='object'?p.time:handTime;if(!Number.isFinite(time)||now-time>300)continue;
   const x=p.x-cameraOffset.x,y=p.y-cameraOffset.y,old=this.history.get(p.id)||(p.name==='object'&&Number.isFinite(p.dx)&&Number.isFinite(p.dy)?{x:x-p.dx,y:y-p.dy,time:time-(p.interval||60)}:null);if(old&&time<=old.time)continue;this.history.set(p.id,{x,y,time});
   if(!old||time-old.time>400)continue;
   const measured=p.name==='object'&&Number.isFinite(p.dx)&&Number.isFinite(p.dy);const dx=measured?p.dx:x-old.x,dy=measured?p.dy:y-old.y,travel=Math.hypot(dx,dy),dt=Math.max(.03,(time-old.time)/1000),floor=p.name==='object'?.0007:.003;
   if(travel<floor)continue;
   const energy=Math.min(1,Math.max(0,travel/dt-(p.name==='object'?.008:.02))*(5+sensitivity*9));
   if(energy>.02)this.active.set(p.id,now+180);
   if(energy>strongest){strongest=energy;this.point={...p};this.direction=dy;}
  }
  if(strongest>.02){this.energy=strongest;this.lastMotion=now;this.revision++}
  for(const [id,p] of this.history)if(now-p.time>500)this.history.delete(id);
 }
 advance(now,{release=.56}={}){
  const dt=this.lastFrame===null?.016:Math.min(.1,Math.max(0,(now-this.lastFrame)/1000));this.lastFrame=now;
  const moving=now-this.lastMotion<220,target=moving?this.energy:0;
  this.level+=(target-this.level)*(1-Math.exp(-dt/(target>this.level?.015:Math.max(.05,release*.5))));
  const note=moving&&this.revision!==this.consumed;if(note)this.consumed=this.revision;
  return {level:this.level,moving,note,point:this.point,direction:this.direction};
 }
}
