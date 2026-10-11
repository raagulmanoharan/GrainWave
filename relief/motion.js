// Sparse, persistent image-feature trajectories. Brightness blobs are never note sources.
const median=a=>{a.sort((x,y)=>x-y);return a[Math.floor(a.length/2)]||0};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function sample(a,w,h,x,y){x=clamp(x,0,w-1);y=clamp(y,0,h-1);const xx=Math.floor(x),yy=Math.floor(y),fx=x-xx,fy=y-yy,i=yy*w+xx;return a[i]*(1-fx)*(1-fy)+a[yy*w+Math.min(w-1,xx+1)]*fx*(1-fy)+a[Math.min(h-1,yy+1)*w+xx]*(1-fx)*fy+a[Math.min(h-1,yy+1)*w+Math.min(w-1,xx+1)]*fx*fy}
function globalFlow(a,b,w,h,bias){let best={x:0,y:0,cost:Infinity};for(let dy=-3;dy<=3;dy+=.5)for(let dx=-3;dx<=3;dx+=.5){const errors=[];for(let y=7;y<h-7;y+=7)for(let x=7+(y%3);x<w-7;x+=9)errors.push(Math.abs(a[y*w+x]-sample(b,w,h,x-dx,y-dy)-bias));errors.sort((x,y)=>x-y);const n=Math.max(1,Math.floor(errors.length*.9)),cost=errors.slice(0,n).reduce((s,v)=>s+v,0)/n+.04*Math.hypot(dx,dy);if(cost<best.cost)best={x:dx,y:dy,cost}}return best}
function patchCost(a,b,w,h,x,y,dx,dy,bias){let sum=0;for(let yy=-2;yy<=2;yy++)for(let xx=-2;xx<=2;xx++)sum+=Math.abs(sample(a,w,h,x+xx,y+yy)-sample(b,w,h,x+xx+dx,y+yy+dy)-bias);return sum/25}
function match(a,b,w,h,p,bias,gx=0,gy=0){
 let best={dx:gx,dy:gy,cost:Infinity};
 const check=(dx,dy)=>{const xx=dx+gx,yy=dy+gy;if(p.x+xx<3||p.x+xx>w-4||p.y+yy<3||p.y+yy>h-4)return;const cost=patchCost(a,b,w,h,p.x,p.y,xx,yy,bias)+.035*Math.hypot(dx,dy);if(cost<best.cost)best={dx:xx,dy:yy,cost}};
 check(0,0);if(best.cost<1.5)return best;
 for(let dy=-8;dy<=8;dy+=2)for(let dx=-8;dx<=8;dx+=2)check(dx,dy);
 const cx=best.dx-gx,cy=best.dy-gy;for(let dy=cy-1;dy<=cy+1;dy++)for(let dx=cx-1;dx<=cx+1;dx++)check(dx,dy);
 return best;
}

function contrast(a,w,h,p){let low=255,high=0;for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++){const v=sample(a,w,h,p.x+x,p.y+y);low=Math.min(low,v);high=Math.max(high,v)}return high-low}
function corners(a,w,h){const candidates=[];for(let y=4;y<h-4;y+=2)for(let x=4;x<w-4;x+=2){let gx=0,gy=0;for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++){gx+=Math.abs(a[(y+yy)*w+x+xx+1]-a[(y+yy)*w+x+xx-1]);gy+=Math.abs(a[(y+yy+1)*w+x+xx]-a[(y+yy-1)*w+x+xx])}const score=Math.min(gx,gy);if(score>20)candidates.push({x,y,score})}candidates.sort((a,b)=>b.score-a.score);return candidates}
export class MotionTracker{
 constructor(){this.reset()}
 reset(){this.previous=null;this.lastTime=null;this.features=[];this.objects=[];this.frame=0;this.nextId=0;this.nextFeature=0;this.state='learning';this.foreground=null;this.cameraMotion={x:0,y:0};this.cameraUncertain=false}
 update(data,w,h,time,maximum=10,sensitivity=.5){const image=new Float32Array(w*h);for(let i=0;i<image.length;i++)image[i]=data[i*4]*.2126+data[i*4+1]*.7152+data[i*4+2]*.0722;this.foreground=new Uint8Array(w*h);this.cameraMotion={x:0,y:0};this.cameraUncertain=false;
 if(!this.previous||this.previous.length!==image.length){this.reset();this.previous=image;this.lastTime=time;this.frame=1;return []}
 const interval=Math.max(1,time-this.lastTime);this.lastTime=time;
 const prior=this.previous,differences=[];for(let i=0;i<image.length;i+=23)differences.push(image[i]-prior[i]);const bias=median(differences),global=globalFlow(image,prior,w,h,bias);this.cameraMotion={x:global.x/w,y:global.y/h};this.cameraUncertain=global.cost>10;
 const moving=[];const next=[];if(!this.cameraUncertain){for(const p of this.features){const forward=match(prior,image,w,h,p,-bias,global.x,global.y);const q={x:p.x+forward.dx,y:p.y+forward.dy};const back=match(image,prior,w,h,q,bias,-global.x,-global.y);const errorLimit=Math.max(7,contrast(prior,w,h,p)*.1);if(forward.cost>errorLimit||back.cost>errorLimit||Math.hypot(forward.dx+back.dx,forward.dy+back.dy)>.75)continue;const rx=forward.dx-global.x,ry=forward.dy-global.y,speed=Math.hypot(rx,ry);const threshold=Math.max(.45,(.45+(1-clamp(sensitivity,0,1))*.4)*clamp(interval/60,.7,1.5))+(Math.hypot(global.x,global.y)>.2?.2:0);const hits=speed>threshold?p.hits+1:0;const updated={...p,...q,hits,rx,ry};next.push(updated);if(hits>=2&&speed>threshold)moving.push(updated)}}
 this.features=next;for(const p of corners(image,w,h)){const cell=this.features.filter(q=>Math.floor(q.x/24)===Math.floor(p.x/24)&&Math.floor(q.y/24)===Math.floor(p.y/24));if(cell.length>=4){const weakest=cell.filter(q=>q.hits===0).sort((a,b)=>a.score-b.score)[0];if(!weakest||weakest.score>=p.score)continue;this.features=this.features.filter(q=>q!==weakest)}if(this.features.length>=140)break;if(this.features.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<4))continue;this.features.push({...p,id:++this.nextFeature,hits:0})}this.previous=image;this.frame++;
 // Compensate ordinary camera travel; silence only unreliable frame alignment.
 if(this.cameraUncertain){this.state='camera';for(const p of this.features)p.hits=0;this.objects=[];return []}this.state=this.frame<6?'learning':'ready';if(this.frame<6)return [];
 const groups=[];for(const p of moving){let group=groups.find(g=>g.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<Math.max(13,w*.14)&&Math.hypot(p.rx-q.rx,p.ry-q.ry)<1.5));if(group)group.push(p);else groups.push([p])}
 const old=this.objects,used=new Set(),out=[];for(const group of groups){if(group.length<2)continue;const x=median(group.map(p=>p.x)),y=median(group.map(p=>p.y)),featureIds=new Set(group.map(p=>p.id));let previous=old.find(o=>!used.has(o.id)&&o.featureIds.some(id=>featureIds.has(id)));if(!previous)previous=old.find(o=>!used.has(o.id)&&Math.hypot(o.x*w-x,o.y*h-y)<14);const id=previous?.id||`motion-${++this.nextId}`;used.add(id);const minX=Math.min(...group.map(p=>p.x))-3,minY=Math.min(...group.map(p=>p.y))-3,maxX=Math.max(...group.map(p=>p.x))+3,maxY=Math.max(...group.map(p=>p.y))+3;const speed=median(group.map(p=>Math.hypot(p.rx,p.ry)));out.push({id,name:'object',x:x/w,y:y/h,time,velocity:clamp(.24+speed*.025,.24,.5),z:.6,energy:1,featureIds:[...featureIds],box:{x:minX/w,y:minY/h,w:(maxX-minX)/w,h:(maxY-minY)/h}});for(const p of group){const xx=Math.round(p.x),yy=Math.round(p.y);this.foreground[yy*w+xx]=1}}
 this.objects=out.slice(0,maximum);return this.objects.map(({featureIds,...p})=>p)
 }
}
