// A deterministic folded surface: broad diagonal ridges with fine grain.
export function surface(x,y){const warp=.18*Math.sin(y*8+x*4)+.07*Math.cos(x*17-y*9);const ridge=Math.sin((x*.85+y*.65+warp)*19);const fold=Math.pow(.5+.5*ridge,1.5);const detail=.06*Math.sin(x*83+y*37)+.035*Math.sin(x*171-y*61);return Math.max(0,Math.min(1,.12+.75*fold+detail))}
export function renderRelief(points,{width,height,dpr,angle,tilt,zoom,depth}){
 const layer=document.createElement('canvas');layer.width=width*dpr;layer.height=height*dpr;const c=layer.getContext('2d');c.scale(dpr,dpr);c.fillStyle='#641209';c.fillRect(0,0,width,height);
 const ca=Math.cos(angle),sa=Math.sin(angle),ct=Math.cos(tilt),st=Math.sin(tilt);
 const projected=points.map(p=>{const x=(p.x-.5)*2.8,y=(p.y-.5)*2,z=(p.z-.5)*depth*.9;const xx=x*ca+z*sa,zz=-x*sa+z*ca,yy=y*ct-zz*st,z2=y*st+zz*ct;const perspective=4.8/(4.8-z2);return {p,x:width/2+xx*perspective*width*.44*zoom,y:height*.45+yy*perspective*height*.65*zoom,z:z2,s:perspective}}).sort((a,b)=>a.y-b.y||a.z-b.z);
 for(const {p,x,y,s} of projected){const seed=Math.sin(p.x*127.1+p.y*311.7)*43758.5453,grain=seed-Math.floor(seed);const size=Math.max(1.1,width/240)*s,extrusion=(8+p.z*height*.20)*depth*s; if(x< -size||x>width||y>height||y+extrusion<0)continue;
 const light=Math.max(0,Math.min(1,p.z*.85+grain*.16)),r=105+light*123,g=16+light*79,b=8+light*47;
 c.fillStyle=`rgb(${r*.65},${g*.5},${b*.48})`;c.fillRect(x+size*.5,y+1,size*.65,extrusion);
 c.fillStyle=`rgb(${r},${g},${b})`;c.fillRect(x,y,size*.6,extrusion);
 c.fillStyle=`rgba(255,${105+light*75},${65+light*65},${.13+grain*.25})`;c.fillRect(x,y,Math.max(.5,size*.15),extrusion);
 c.fillStyle=`rgb(${Math.min(255,r+25)},${g+20},${b+12})`;c.fillRect(x,y,size,.8*s);
 }
 const shade=c.createLinearGradient(0,0,width,0);shade.addColorStop(0,'#31090050');shade.addColorStop(.4,'#31090000');shade.addColorStop(1,'#31090028');c.fillStyle=shade;c.fillRect(0,0,width,height);
 // Sparse typographic dither follows bright depth ridges, rather than a flat overlay.
 c.font=`${Math.max(5,Math.min(9,width/95))}px monospace`;c.textAlign='center';
 for(let i=0;i<projected.length;i+=37){const {p,x,y}=projected[i];if(p.z<.62||x<0||x>width||y<height*.24||y>height*.84)continue;c.fillStyle=`rgba(255,243,212,${.25+(p.z-.62)*1.2})`;c.fillText(i%3===0?'#':'+',x,y)}
 return layer;
}
