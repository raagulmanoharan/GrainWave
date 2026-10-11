// Real pixel-serif typography with an independently animated wireframe globe.
export class LandingType{
 constructor(){this.canvas=document.getElementById('landing-type');this.ctx=this.canvas.getContext('2d');this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.open=true;this.start=performance.now();this.ready=false;this.frame=null;this.edges=[];
  for(let lat=-3;lat<=3;lat++){for(let j=0;j<48;j++)this.edges.push([this.point(lat*Math.PI/8,j*Math.PI/24),this.point(lat*Math.PI/8,(j+1)*Math.PI/24)])}
  for(let lon=0;lon<12;lon++){for(let j=0;j<32;j++)this.edges.push([this.point(-Math.PI/2+j*Math.PI/32,lon*Math.PI/6),this.point(-Math.PI/2+(j+1)*Math.PI/32,lon*Math.PI/6)])}
  document.fonts.load('600 100px ReliefSerif').then(()=>{this.buildTitle();this.ready=true;this.start=performance.now();this.tick()});window.addEventListener('resize',()=>this.resize());this.resize()}
 point(lat,lon){return [Math.cos(lat)*Math.cos(lon),Math.sin(lat),Math.cos(lat)*Math.sin(lon)]}
 resize(){this.w=innerWidth;this.h=innerHeight;this.d=Math.min(devicePixelRatio,2);this.canvas.width=this.w*this.d;this.canvas.height=this.h*this.d}
 buildTitle(){const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font='600 100px ReliefSerif';const m=ctx.measureText('RELIEF'),scale=.42;canvas.width=Math.ceil((m.actualBoundingBoxLeft+m.actualBoundingBoxRight)*scale)+2;canvas.height=Math.ceil((m.actualBoundingBoxAscent+m.actualBoundingBoxDescent)*scale)+2;ctx.scale(scale,scale);ctx.font='600 100px ReliefSerif';ctx.fillStyle='#fff';ctx.fillText('RELIEF',m.actualBoundingBoxLeft+1/scale,m.actualBoundingBoxAscent+1/scale);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);for(let i=3;i<pixels.data.length;i+=4)pixels.data[i]=pixels.data[i]>100?255:0;ctx.putImageData(pixels,0,0);this.title=canvas}
 setPlaying(playing){this.open=!playing;this.start=performance.now();this.canvas.hidden=false;if(this.ready&&!this.frame)this.tick()}
 tick=()=>{this.frame=null;const now=performance.now(),p=Math.min(1,(now-this.start)/(this.reduced?1:950)),{ctx,w,h,d}=this;ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,w,h);
  if(!this.open&&p===1){this.canvas.hidden=true;return}
  const angle=this.reduced?0:now*.00015,radius=Math.min(w*.46,h*.27),burst=this.open?0:p*p;
  const project=(point,index)=>{const [x,y,z]=point,rx=x*Math.cos(angle)+z*Math.sin(angle),rz=z*Math.cos(angle)-x*Math.sin(angle),tilt=.27,ry=y*Math.cos(tilt)-rz*Math.sin(tilt),depth=y*Math.sin(tilt)+rz*Math.cos(tilt);const length=1+burst*(1.5+(index%13)/5);return {x:w/2+rx*radius*length,y:h/2+ry*radius*length,z:depth}};
  ctx.lineWidth=.65;ctx.setLineDash([]);
  this.edges.forEach(([a,b],i)=>{const u=project(a,i),v=project(b,i);ctx.globalAlpha=(u.z+v.z>0?.5:.2)*(this.open?Math.min(1,p*3):1-p);ctx.strokeStyle='#fff';ctx.beginPath();ctx.moveTo(u.x,u.y);ctx.lineTo(v.x,v.y);if(burst>.06){const length=1+burst*2;ctx.lineTo(w/2+(v.x-w/2)*length,h/2+(v.y-h/2)*length)}ctx.stroke()});
  const targetW=w*.94,targetH=h*.8,left=(w-targetW)/2,top=(h-targetH)/2;
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=this.open?Math.min(1,p*3):1;
  if(!this.open){const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];ctx.beginPath();for(let y=top;y<top+targetH;y+=6)for(let x=left;x<left+targetW;x+=6){const ix=Math.floor((x-left)/6),iy=Math.floor((y-top)/6);if(bayer[(iy%4)*4+ix%4]/16>=p)ctx.rect(x,y,6,6)}ctx.clip()}
  ctx.drawImage(this.title,left,top,targetW,targetH);ctx.restore();
  if(!this.open){ctx.globalAlpha=Math.sin(p*Math.PI)*.65;ctx.fillStyle='#fff';for(let i=0;i<360;i++){const rx=((i*7919)%1009)/1009,ry=((i*3571)%1013)/1013;ctx.fillRect(left+rx*targetW+(rx-.5)*p*w*.4,top+ry*targetH+(ry-.5)*p*h*.4,2,2)}}
  ctx.globalAlpha=1;if(this.open||p<1)this.frame=requestAnimationFrame(this.tick)
 }
}
