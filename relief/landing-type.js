// Real pixel-serif typography with an independently animated wireframe globe.
export class LandingType{
 constructor(){this.canvas=document.getElementById('landing-type');this.ctx=this.canvas.getContext('2d');this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.open=true;this.start=performance.now();this.ready=false;this.frame=null;this.edges=[];
  for(let lat=-3;lat<=3;lat++){for(let j=0;j<48;j++)this.edges.push([this.point(lat*Math.PI/8,j*Math.PI/24),this.point(lat*Math.PI/8,(j+1)*Math.PI/24)])}
  for(let lon=0;lon<12;lon++){for(let j=0;j<32;j++)this.edges.push([this.point(-Math.PI/2+j*Math.PI/32,lon*Math.PI/6),this.point(-Math.PI/2+(j+1)*Math.PI/32,lon*Math.PI/6)])}
  document.fonts.load('100px ReliefPixel').then(()=>{this.ready=true;this.start=performance.now();this.tick()});window.addEventListener('resize',()=>this.resize());this.resize()}
 point(lat,lon){return [Math.cos(lat)*Math.cos(lon),Math.sin(lat),Math.cos(lat)*Math.sin(lon)]}
 resize(){this.w=innerWidth;this.h=innerHeight;this.d=Math.min(devicePixelRatio,2);this.canvas.width=this.w*this.d;this.canvas.height=this.h*this.d}
 setPlaying(playing){this.open=!playing;this.start=performance.now();this.canvas.hidden=false;if(this.ready&&!this.frame)this.tick()}
 tick=()=>{this.frame=null;const now=performance.now(),p=Math.min(1,(now-this.start)/(this.reduced?1:950)),{ctx,w,h,d}=this;ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,w,h);
  if(!this.open&&p===1){this.canvas.hidden=true;return}
  const angle=this.reduced?0:now*.00015,radius=Math.min(w*.46,h*.27),burst=this.open?0:p*p;
  const project=(point,index)=>{const [x,y,z]=point,rx=x*Math.cos(angle)+z*Math.sin(angle),rz=z*Math.cos(angle)-x*Math.sin(angle),tilt=.27,ry=y*Math.cos(tilt)-rz*Math.sin(tilt),depth=y*Math.sin(tilt)+rz*Math.cos(tilt);const length=1+burst*(1.5+(index%13)/5);return {x:w/2+rx*radius*length,y:h/2+ry*radius*length,z:depth}};
  ctx.lineWidth=.65;ctx.setLineDash([]);
  this.edges.forEach(([a,b],i)=>{const u=project(a,i),v=project(b,i);ctx.globalAlpha=(u.z+v.z>0?.5:.2)*(this.open?Math.min(1,p*3):1-p);ctx.strokeStyle='#fff';ctx.beginPath();ctx.moveTo(u.x,u.y);ctx.lineTo(v.x,v.y);if(burst>.06){const length=1+burst*2;ctx.lineTo(w/2+(v.x-w/2)*length,h/2+(v.y-h/2)*length)}ctx.stroke()});
  ctx.globalAlpha=this.open?Math.min(1,p*3):Math.max(0,1-p*1.5);
  // Stretch real bitmap-serif glyphs by their visible bounds, preserving crisp pixels.
  ctx.font='400 100px ReliefPixel';ctx.textBaseline='alphabetic';const text='RELIEF',m=ctx.measureText(text),inkHeight=m.actualBoundingBoxAscent+m.actualBoundingBoxDescent,targetW=w*.88,targetH=h*.38;
  ctx.save();ctx.translate((w-targetW)/2,(h-targetH)/2);ctx.scale(targetW/(m.actualBoundingBoxLeft+m.actualBoundingBoxRight),targetH/inkHeight);ctx.fillStyle='#fff';ctx.fillText(text,m.actualBoundingBoxLeft,m.actualBoundingBoxAscent);ctx.restore();
  ctx.globalAlpha=1;if(this.open||p<1)this.frame=requestAnimationFrame(this.tick)
 }
}
