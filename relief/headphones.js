// A small rotating point-cloud sculpture. No image downloads or 3D library.
export class Headphones {
 constructor(host){this.canvas=document.createElement('canvas');this.canvas.setAttribute('aria-hidden','true');host.replaceChildren(this.canvas);this.host=host;this.ctx=this.canvas.getContext('2d');this.points=[];this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Headband: a semicircular tubular surface, with two cushioned ear cups.
  for(let i=0;i<110;i++){const a=Math.PI*i/109;for(let j=0;j<18;j++){const b=2*Math.PI*j/18,r=.78+.045*Math.cos(b);this.points.push([Math.cos(a)*r,.12-Math.sin(a)*r,.045*Math.sin(b),.7+.25*Math.sin(b)])}}
  for(const side of [-1,1])for(let i=0;i<48;i++){const a=2*Math.PI*i/48;for(let j=1;j<26;j++){const b=Math.PI*j/26;this.points.push([side*(.77+.12*Math.cos(b)),.2+.31*Math.sin(b)*Math.cos(a),.22*Math.sin(b)*Math.sin(a),.35+.6*(Math.sin(a)+1)/2])}}
 }
 start(){this.stop();this.startTime=performance.now();this.last=-Infinity;this.tick(this.startTime)}
 stop(){cancelAnimationFrame(this.frame);this.frame=null}
 tick=(time)=>{if(time-this.last>=40){this.last=time;const w=Math.max(1,this.host.clientWidth),h=Math.max(1,this.host.clientHeight),d=Math.min(devicePixelRatio,2);if(this.canvas.width!==Math.round(w*d)||this.canvas.height!==Math.round(h*d)){this.canvas.width=Math.round(w*d);this.canvas.height=Math.round(h*d)}const c=this.ctx;c.setTransform(d,0,0,d,0,0);c.fillStyle='#080808';c.fillRect(0,0,w,h);const angle=this.reduced?-.4:(time-this.startTime)*.00045-.4,cos=Math.cos(angle),sin=Math.sin(angle),scale=Math.min(w*.48,h*.48),bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
   for(let i=0;i<this.points.length;i++){const [x,y,z,shade]=this.points[i],rx=x*cos+z*sin,depth=z*cos-x*sin,p=1/(1+depth*.24),px=Math.round(w/2+rx*scale*p),py=Math.round(h*.55+y*scale*p);const light=Math.max(.15,Math.min(.95,shade*(.7+depth*.18)));if(light>bayer[(py&3)*4+(px&3)]/16){const tone=Math.round((.45+light*.55)*255);c.fillStyle=`rgb(${tone},${tone},${tone})`;c.fillRect(px,py,1.2,1.2)}}
  }if(!this.reduced)this.frame=requestAnimationFrame(this.tick)}
}
