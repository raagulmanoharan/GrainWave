// Recognition supplies identities; measured optical flow supplies movement.
const allowed=new Set(['person','bicycle','car','motorcycle','bus','truck','bird','cat','dog','horse','sheep','cow']);
const median=a=>{a.sort((x,y)=>x-y);return a[Math.floor(a.length/2)]||0};
const overlap=(a,b)=>{const area=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));return area/(a.w*a.h+b.w*b.h-area||1)};
export class ObjectTracks{
 constructor(){this.reset()}
 reset(){this.tracks=[];this.serial=0;this.lastTime=null}
 detect(predictions,time,now=time){
  if(now-time>5000)return;
  const candidates=[];
  for(const p of [...predictions].sort((a,b)=>b.score-a.score)){
   const b=p.box;if(!allowed.has(p.class)||p.score<.55||!b||![b.x,b.y,b.w,b.h].every(Number.isFinite)||b.w<=0||b.h<=0)continue;
   if(candidates.some(q=>overlap(q.box,b)>.65))continue;
   candidates.push(p);
  }
  const used=new Set();
  for(const p of candidates.slice(0,12)){
   const old=this.tracks.filter(t=>!used.has(t.id)&&t.label===p.class).map(t=>({t,score:Math.max(overlap(t.box,p.box),overlap(t.detectedBox,p.box))})).sort((a,b)=>b.score-a.score)[0];
   if(old&&old.score>.2){const t=old.t;used.add(t.id);t.seen=now;t.detectedBox={...p.box};/* Flow is current; detector boxes describe an older frame. */if(now-time<250)for(const k of ['x','y','w','h'])t.box[k]=t.box[k]*.7+p.box[k]*.3;else{t.box.w=p.box.w;t.box.h=p.box.h}}
   else{const t={id:`object-${++this.serial}`,label:p.class,box:{...p.box},detectedBox:{...p.box},seen:now,hits:0};this.tracks.push(t);used.add(t.id)}
  }
  this.tracks=this.tracks.filter(t=>now-t.seen<2500);
 }
 visible(time){return this.tracks.filter(t=>time-t.seen<2500)}
 update(flow,time,{uncertain=false,sensitivity=.5,maximum=10}={}){
  const dt=this.lastTime===null?83:Math.max(1,time-this.lastTime);this.lastTime=time;
  this.tracks=this.tracks.filter(t=>time-t.seen<2500);
  if(uncertain){for(const t of this.tracks)t.hits=0;return []}
  const floor=(.0012+(1-sensitivity)*.002)*Math.min(2,dt/83),output=[];
  const points=new Map(this.tracks.map(t=>[t.id,[]]));
  // Assign an overlapping feature to just one object, favouring the smaller box.
  for(const p of flow){const owner=this.tracks.filter(t=>p.x>=t.box.x&&p.x<=t.box.x+t.box.w&&p.y>=t.box.y&&p.y<=t.box.y+t.box.h).sort((a,b)=>a.box.w*a.box.h-b.box.w*b.box.h)[0];if(owner)points.get(owner.id).push(p)}
  for(const t of this.tracks){
   const pointsIn=points.get(t.id),moving=pointsIn.filter(p=>Math.hypot(p.rx,p.ry)>floor);
   const dx=median(moving.map(p=>p.rx)),dy=median(moving.map(p=>p.ry));
   const coherent=moving.filter(p=>p.rx*dx+p.ry*dy>0).length;
   const active=moving.length>=3&&moving.length>=pointsIn.length*.3&&coherent>=moving.length*.7&&Math.hypot(dx,dy)>floor;
   t.hits=active?t.hits+1:0;
   if(pointsIn.length>=3){t.box.x=Math.max(0,Math.min(1-t.box.w,t.box.x+median(pointsIn.map(p=>p.dx))));t.box.y=Math.max(0,Math.min(1-t.box.h,t.box.y+median(pointsIn.map(p=>p.dy))))}
   if(t.hits>=3)output.push({id:t.id,name:'object',label:t.label,confirmed:true,x:t.box.x+t.box.w/2,y:t.box.y+t.box.h/2,dx,dy,time,interval:dt,z:.6,energy:1,velocity:.3,box:{...t.box}});
  }
  return output.slice(0,maximum);
 }
}
