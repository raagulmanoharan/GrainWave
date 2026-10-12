import {TrackingContrast} from './tracking-contrast.js';
// Sparse, persistent image-feature trajectories. Brightness blobs are never note sources.
const median=a=>{a.sort((x,y)=>x-y);return a[Math.floor(a.length/2)]||0};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function sample(a,w,h,x,y){x=clamp(x,0,w-1);y=clamp(y,0,h-1);const xx=Math.floor(x),yy=Math.floor(y),fx=x-xx,fy=y-yy,i=yy*w+xx;return a[i]*(1-fx)*(1-fy)+a[yy*w+Math.min(w-1,xx+1)]*fx*(1-fy)+a[Math.min(h-1,yy+1)*w+xx]*(1-fx)*fy+a[Math.min(h-1,yy+1)*w+Math.min(w-1,xx+1)]*fx*fy}
function globalFlow(a,b,w,h,bias){let best={x:0,y:0,cost:Infinity};for(let dy=-3;dy<=3;dy+=.5)for(let dx=-3;dx<=3;dx+=.5){const errors=[];for(let y=7;y<h-7;y+=Math.max(7,Math.round(h/48)))for(let x=7+(y%3);x<w-7;x+=Math.max(9,Math.round(w/32)))errors.push(Math.abs(a[y*w+x]-sample(b,w,h,x-dx,y-dy)-bias));errors.sort((x,y)=>x-y);const n=Math.max(1,Math.floor(errors.length*.9)),cost=errors.slice(0,n).reduce((s,v)=>s+v,0)/n+.04*Math.hypot(dx,dy);if(cost<best.cost)best={x:dx,y:dy,cost}}return best}
function patchCost(a,b,w,h,x,y,dx,dy,bias){let sum=0;for(let yy=-2;yy<=2;yy++)for(let xx=-2;xx<=2;xx++)sum+=Math.abs(sample(a,w,h,x+xx,y+yy)-sample(b,w,h,x+xx+dx,y+yy+dy)-bias);return sum/25}
function match(a,b,w,h,p,bias,gx=0,gy=0,early=1.5){
 let best={dx:gx,dy:gy,cost:Infinity};
 const check=(dx,dy)=>{const xx=dx+gx,yy=dy+gy;if(p.x+xx<3||p.x+xx>w-4||p.y+yy<3||p.y+yy>h-4)return;const cost=patchCost(a,b,w,h,p.x,p.y,xx,yy,bias)+.035*Math.hypot(dx,dy);if(cost<best.cost)best={dx:xx,dy:yy,cost}};
 check(0,0);if(best.cost<early)return best;
 for(let dy=-8;dy<=8;dy+=2)for(let dx=-8;dx<=8;dx+=2)check(dx,dy);
 const cx=best.dx-gx,cy=best.dy-gy;for(let dy=cy-1;dy<=cy+1;dy++)for(let dx=cx-1;dx<=cx+1;dx++)check(dx,dy);
 return best;
}

function contrast(a,w,h,p){let low=255,high=0;for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++){const v=sample(a,w,h,p.x+x,p.y+y);low=Math.min(low,v);high=Math.max(high,v)}return high-low}
function corners(a,w,h){const candidates=[];for(let y=4;y<h-4;y+=2)for(let x=4;x<w-4;x+=2){let gx=0,gy=0;for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++){gx+=Math.abs(a[(y+yy)*w+x+xx+1]-a[(y+yy)*w+x+xx-1]);gy+=Math.abs(a[(y+yy+1)*w+x+xx]-a[(y+yy-1)*w+x+xx])}const score=Math.min(gx,gy);if(score>20)candidates.push({x,y,score})}candidates.sort((a,b)=>b.score-a.score);return candidates}
export class MotionTracker{
 constructor({enhance=false}={}){this.enhancer=enhance?new TrackingContrast():null;this.reset()}
 reset(){this.previous=null;this.rawPrevious=null;this.lastTime=null;this.features=[];this.objects=[];this.frame=0;this.nextId=0;this.nextFeature=0;this.state='learning';this.foreground=null;this.cameraMotion={x:0,y:0};this.cameraUncertain=false}
 update(data,w,h,time,maximum=10,sensitivity=.5){const image=this.enhancer?this.enhancer.process(data,w,h):new Float32Array(w*h);if(!this.enhancer)for(let i=0;i<image.length;i++)image[i]=data[i*4]*.2126+data[i*4+1]*.7152+data[i*4+2]*.0722;const rawImage=this.enhancer?.gray;this.foreground=new Uint8Array(w*h);this.cameraMotion={x:0,y:0};this.cameraUncertain=false;
 if(!this.previous||this.previous.length!==image.length){this.reset();this.previous=image;this.rawPrevious=rawImage?.slice();this.lastTime=time;this.frame=1;return []}
 const interval=Math.max(1,time-this.lastTime);this.lastTime=time;
 const prior=this.previous,differences=[];for(let i=0;i<image.length;i+=23)differences.push(image[i]-prior[i]);const bias=median(differences),global=globalFlow(this.enhancer?rawImage:image,this.enhancer?this.rawPrevious:prior,w,h,bias);this.cameraMotion={x:global.x/w,y:global.y/h};this.cameraUncertain=global.cost>10;
 const moving=[],next=[];if(!this.cameraUncertain){for(const p of this.features){const forward=match(prior,image,w,h,p,-bias,global.x,global.y,this.enhancer?.6:1.5),q={x:p.x+forward.dx,y:p.y+forward.dy},back=match(image,prior,w,h,q,bias,-global.x,-global.y,this.enhancer?.6:1.5),errorLimit=Math.max(this.enhancer?10:7,contrast(prior,w,h,p)*(this.enhancer?.14:.1));if(forward.cost>errorLimit||back.cost>errorLimit||Math.hypot(forward.dx+back.dx,forward.dy+back.dy)>.75)continue;const rx=forward.dx-global.x,ry=forward.dy-global.y,supported=!this.enhancer||patchCost(this.rawPrevious,rawImage,w,h,p.x,p.y,forward.dx,forward.dy,-bias)<patchCost(this.rawPrevious,rawImage,w,h,p.x,p.y,global.x,global.y,-bias)-.3;next.push({...p,...q,rx,ry,previousRx:p.rx,previousRy:p.ry,supported})}}
 // A broad, coherent rotation is camera shake, not an object trajectory.
 const rotationCells=new Map();for(const p of next){const x=p.x-w/2,y=p.y-h/2,r2=x*x+y*y;if(r2<(Math.min(w,h)*.18)**2)continue;const key=Math.floor(p.x/w*4)+Math.floor(p.y/h*4)*4;if(!rotationCells.has(key))rotationCells.set(key,[]);rotationCells.get(key).push((-p.rx*y+p.ry*x)/r2)}
 const angles=[...rotationCells.values()].map(values=>median(values)),angle=angles.length>=8?median(angles):0,spread=angles.length?median(angles.map(a=>Math.abs(a-angle))):Infinity,rotation=angles.length>=8&&Math.abs(angle)<.012&&spread<.0015?angle:0;
 const threshold=Math.max(.45,(.45+(1-clamp(sensitivity,0,1))*.4)*clamp(interval/60,.7,1.5))+(Math.hypot(global.x,global.y)>.2?.2:0);
 for(const p of next){p.rx+=rotation*(p.y-h/2);p.ry-=rotation*(p.x-w/2);const speed=Math.hypot(p.rx,p.ry),consistent=!p.hits||p.rx*p.previousRx+p.ry*p.previousRy>0;p.hits=speed>threshold&&p.supported?(consistent?p.hits+1:1):0;if(p.hits>=2&&speed>threshold)moving.push(p)}
 // Reserve feature capacity across the whole scene; foliage cannot consume it all.
 const cellKey=p=>Math.floor(p.x/w*8)+8*Math.floor(p.y/h*12),buckets=new Map();
 for(const p of corners(image,w,h)){const residual=Math.abs(sample(image,w,h,p.x,p.y)-sample(prior,w,h,p.x-global.x,p.y-global.y)-bias);p.priority=p.score+Math.max(0,residual-6)*12;const key=cellKey(p);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(p)}
 for(const list of buckets.values())list.sort((a,b)=>b.priority-a.priority);
 this.features=next;const ordered=[];for(let rank=0;rank<4;rank++)for(const list of buckets.values())if(list[rank])ordered.push(list[rank]);
 for(const p of ordered){const cell=this.features.filter(q=>cellKey(q)===cellKey(p));if(this.features.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<4))continue;if(cell.length>=3){const weakest=cell.filter(q=>q.hits===0).sort((a,b)=>a.score-b.score)[0];if(!weakest||weakest.score>=p.priority)continue;this.features=this.features.filter(q=>q!==weakest)}if(this.features.length>=240)continue;this.features.push({...p,id:++this.nextFeature,hits:0})}
 this.previous=image;this.rawPrevious=rawImage?.slice();this.frame++;
 // Compensate ordinary camera travel; silence only unreliable frame alignment.
 if(this.cameraUncertain){this.state='camera';for(const p of this.features)p.hits=0;this.objects=[];return []}this.state=this.frame<6?'learning':'ready';if(this.frame<6)return [];
 const groups=[];for(const p of moving){let group=groups.find(g=>g.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<Math.max(13,w*.14)&&Math.hypot(p.rx-q.rx,p.ry-q.ry)<1.5));if(group)group.push(p);else groups.push([p])}
 const old=this.objects,used=new Set(),out=[];for(const group of groups){if(group.length<2)continue;const x=median(group.map(p=>p.x)),y=median(group.map(p=>p.y)),featureIds=new Set(group.map(p=>p.id));let previous=old.find(o=>!used.has(o.id)&&o.featureIds.some(id=>featureIds.has(id)));if(!previous)previous=old.find(o=>!used.has(o.id)&&Math.hypot(o.x*w-x,o.y*h-y)<14);const id=previous?.id||`motion-${++this.nextId}`;used.add(id);const minX=Math.min(...group.map(p=>p.x))-3,minY=Math.min(...group.map(p=>p.y))-3,maxX=Math.max(...group.map(p=>p.x))+3,maxY=Math.max(...group.map(p=>p.y))+3;const speed=median(group.map(p=>Math.hypot(p.rx,p.ry)));out.push({id,name:'object',x:x/w,y:y/h,time,dx:median(group.map(p=>p.rx))/w,dy:median(group.map(p=>p.ry))/h,interval,velocity:clamp(.24+speed*.025,.24,.5),z:.6,energy:1,featureIds:[...featureIds],box:{x:minX/w,y:minY/h,w:(maxX-minX)/w,h:(maxY-minY)/h}});for(const p of group){const xx=Math.round(p.x),yy=Math.round(p.y);this.foreground[yy*w+xx]=1}}
 this.objects=out.sort((a,b)=>Math.hypot(b.dx,b.dy)-Math.hypot(a.dx,a.dy)).slice(0,maximum);return this.objects.map(({featureIds,...p})=>p)
 }
}
