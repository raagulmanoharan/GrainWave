/* OpenCV.js supplies Shi–Tomasi features, pyramidal Lucas–Kanade flow and
 * RANSAC background alignment. This layer turns residual motion into notes. */
(function(root){
const median=a=>{a.sort((x,y)=>x-y);return a[Math.floor(a.length/2)]||0};
class OpenCVMotion {
 constructor(cv){this.cv=cv;this.clahe=new cv.CLAHE(1.5,new cv.Size(8,8));this.reset()}
 reset(){this.previous?.delete();this.previous=null;this.features=[];this.objects=[];this.lastTime=null;this.serial=0;this.frames=0;this.width=0;this.height=0}
 update(data,w,h,time,maximum=10,sensitivity=.5){
  const cv=this.cv,owned=[],mat=(...args)=>{const m=new cv.Mat(...args);owned.push(m);return m};
  if(w!==this.width||h!==this.height||this.lastTime!==null&&time-this.lastTime>350){this.reset();this.width=w;this.height=h}
  const dt=this.lastTime===null?60:Math.max(1,time-this.lastTime);this.lastTime=time;
  const rgba=mat(h,w,cv.CV_8UC4),gray=mat();rgba.data.set(data);cv.cvtColor(rgba,gray,cv.COLOR_RGBA2GRAY);
  // Preserve grain: contrast enhancement only, with no blur or denoising.
  const enhanced=mat();this.clahe.apply(gray,enhanced);cv.addWeighted(gray,.5,enhanced,.5,0,gray);
  const result={sources:[],state:'learning',cameraMotion:{x:0,y:0},cameraUncertain:false};
  try {
   let survivors=[];
   if(this.previous&&this.features.length>=4){
    const p0=cv.matFromArray(this.features.length,1,cv.CV_32FC2,this.features.flatMap(p=>[p.x,p.y]));owned.push(p0);
    const p1=mat(),status=mat(),error=mat(),back=mat(),backStatus=mat(),backError=mat();
    const win=new cv.Size(15,15),criteria=new cv.TermCriteria(cv.TermCriteria_EPS|cv.TermCriteria_COUNT,20,.01);
    cv.calcOpticalFlowPyrLK(this.previous,gray,p0,p1,status,error,win,3,criteria);
    cv.calcOpticalFlowPyrLK(gray,this.previous,p1,back,backStatus,backError,win,3,criteria);
    const valid=[];
    for(let i=0;i<this.features.length;i++){
     const old=this.features[i],x=p1.data32F[i*2],y=p1.data32F[i*2+1];
     if(!status.data[i]||!backStatus.data[i]||error.data32F[i]>18||!Number.isFinite(x+y)||x<4||y<4||x>w-5||y>h-5||Math.hypot(back.data32F[i*2]-old.x,back.data32F[i*2+1]-old.y)>1)continue;
     valid.push({...old,x,y,oldX:old.x,oldY:old.y,dx:x-old.x,dy:y-old.y});
    }
    const gx=median(valid.map(p=>p.dx)),gy=median(valid.map(p=>p.dy));
    let transform=null,inliers=0;
    if(valid.length>=12){
     const a=cv.matFromArray(valid.length,1,cv.CV_32FC2,valid.flatMap(p=>[p.oldX,p.oldY])),b=cv.matFromArray(valid.length,1,cv.CV_32FC2,valid.flatMap(p=>[p.x,p.y])),mask=mat();owned.push(a,b);
     const H=cv.findHomography(a,b,cv.RANSAC,.8,mask);owned.push(H);
     for(const v of mask.data)inliers+=!!v;
     const cells=new Set(valid.filter((_,i)=>mask.data[i]).map(p=>Math.floor(p.oldX/w*3)+Math.floor(p.oldY/h*3)*3));
     if(!H.empty()&&inliers>=8&&cells.size>=4)transform=Array.from(H.data64F);
    }
    const project=(x,y)=>{if(!transform)return [x+gx,y+gy];const m=transform,z=m[6]*x+m[7]*y+m[8];return [(m[0]*x+m[1]*y+m[2])/z,(m[3]*x+m[4]*y+m[5])/z]};
    const center=project(w/2,h/2);result.cameraMotion={x:(center[0]-w/2)/w,y:(center[1]-h/2)/h};
    result.cameraUncertain=valid.length<8||(!transform&&Math.hypot(gx,gy)>1);
    result.state=result.cameraUncertain?'camera':'ready';
    const floor=Math.max(.3,(.22+(1-sensitivity)*.5)*Math.min(2,dt/60));
    const moving=[];
    for(const p of valid){
     const bg=project(p.oldX,p.oldY);p.rx=p.x-bg[0];p.ry=p.y-bg[1];const speed=Math.hypot(p.rx,p.ry);
     if(!result.cameraUncertain&&speed>floor){
      const consistent=p.hits&&time-p.evidence<200&&p.rx*p.lastRx+p.ry*p.lastRy>0;
      p.hits=consistent?p.hits+1:1;p.evidence=time;p.lastRx=p.rx;p.lastRy=p.ry;
      if(p.hits>=3)moving.push(p);
     }else if(result.cameraUncertain||time-(p.evidence||0)>180)p.hits=0;
     survivors.push(p);
    }
    const groups=[];
    for(const p of moving){const g=groups.find(g=>g.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<Math.max(12,w*.07)&&Math.hypot(p.rx-q.rx,p.ry-q.ry)<1.5));if(g)g.push(p);else groups.push([p])}
    const used=new Set();
    for(const group of groups){
     if(group.length<2)continue;
     const x=median(group.map(p=>p.x)),y=median(group.map(p=>p.y)),dx=median(group.map(p=>p.rx)),dy=median(group.map(p=>p.ry));
     if(Math.hypot(dx,dy)<floor)continue;
     const old=this.objects.find(o=>!used.has(o.id)&&group.some(p=>o.features.includes(p.id)));
     const id=old?.id||`motion-${++this.serial}`;used.add(id);
     const minX=Math.max(0,Math.min(...group.map(p=>p.x))-4),minY=Math.max(0,Math.min(...group.map(p=>p.y))-4),maxX=Math.min(w,Math.max(...group.map(p=>p.x))+4),maxY=Math.min(h,Math.max(...group.map(p=>p.y))+4);
     result.sources.push({id,name:'object',confirmed:true,x:x/w,y:y/h,dx:dx/w,dy:dy/h,time,interval:dt,z:.6,energy:1,velocity:.3,features:group.map(p=>p.id),box:{x:minX/w,y:minY/h,w:(maxX-minX)/w,h:(maxY-minY)/h}});
    }
   }
   // Replenish features throughout the view, including low-contrast distant objects.
   if(survivors.length<160||this.frames%8===0){
    const mask=mat(h,w,cv.CV_8UC1,new cv.Scalar(255)),corners=mat();
    for(const p of survivors)cv.circle(mask,new cv.Point(p.x,p.y),5,new cv.Scalar(0),-1);
    cv.goodFeaturesToTrack(gray,corners,Math.max(1,240-survivors.length),.008,5,mask,3,false,.04);
    for(let i=0;i<corners.rows&&survivors.length<240;i++)survivors.push({id:++this.serial,x:corners.data32F[2*i],y:corners.data32F[2*i+1],hits:0});
   }
   this.features=survivors;this.frames++;
   result.sources.sort((a,b)=>Math.hypot(b.dx,b.dy)-Math.hypot(a.dx,a.dy));const distinct=[];
   for(const source of result.sources){
    const b=source.box;
    if(distinct.some(p=>{const a=p.box,intersection=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));return intersection/Math.max(1e-9,Math.min(a.w*a.h,b.w*b.h))>.35}))continue;
    distinct.push(source);if(distinct.length>=maximum)break;
   }
   result.sources=distinct;
   this.objects=result.sources;
   // Small visual-only mask follows coherent feature clusters, not bounding boxes.
   // Never feed this mask or its smoothing back into motion/note detection.
   if(!result.cameraUncertain&&distinct.length){
    const mw=80,mh=Math.max(1,Math.min(160,Math.round(h/w*mw))),sx=mw/w,sy=mh/h;
    const mask=mat(mh,mw,cv.CV_8UC1,new cv.Scalar(0));
    for(const source of distinct.slice(0,6)){
     const ids=new Set(source.features),points=survivors.filter(p=>ids.has(p.id)).slice(0,32);
     const radius=Math.max(2,Math.round(7*sx));
     for(let i=0;i<points.length;i++){
      const p=points[i],at=new cv.Point(Math.round(p.x*sx),Math.round(p.y*sy));
      cv.circle(mask,at,radius,new cv.Scalar(255),-1);
      for(let j=0;j<i;j++){const q=points[j];if(Math.hypot(p.x-q.x,p.y-q.y)<Math.max(16,w*.09))cv.line(mask,at,new cv.Point(Math.round(q.x*sx),Math.round(q.y*sy)),new cv.Scalar(255),radius*2)}
     }
    }
    result.foreground={width:mw,height:mh,data:new Uint8Array(mask.data),time};
   }
   this.previous?.delete();this.previous=gray.clone();
   return {...result,sources:result.sources.map(({features,...p})=>p)};
  } finally {for(const m of owned)m.delete()}
 }
}
root.OpenCVMotion=OpenCVMotion;
})(globalThis);
