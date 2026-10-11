// Small block-matched optical flow for visual advection only; never a note source.
export function motionFlow(previous,current,width,height){
 const flow=new Float32Array(width*height*3),tile=8,radius=3;
 if(!previous)return flow;
 for(let by=0;by<height;by+=tile)for(let bx=0;bx<width;bx+=tile){
  const x0=Math.max(radius,bx),y0=Math.max(radius,by),x1=Math.min(width-radius,bx+tile),y1=Math.min(height-radius,by+tile);
  let baseline=0,count=0;for(let y=y0;y<y1;y+=2)for(let x=x0;x<x1;x+=2){baseline+=Math.abs(current[y*width+x]-previous[y*width+x]);count++}
  if(!count||baseline/count<4)continue;
  let best=baseline,dx=0,dy=0;
  for(let sy=-radius;sy<=radius;sy++)for(let sx=-radius;sx<=radius;sx++){
   let score=0;for(let y=y0;y<y1;y+=2)for(let x=x0;x<x1;x+=2)score+=Math.abs(current[y*width+x]-previous[(y-sy)*width+x-sx]);
   score+=(Math.abs(sx)+Math.abs(sy))*count*.3;
   if(score<best){best=score;dx=sx;dy=sy}
  }
  if(best>baseline*.8)continue;const energy=Math.min(1,Math.hypot(dx,dy)/3);
  for(let y=by;y<Math.min(height,by+tile);y++)for(let x=bx;x<Math.min(width,bx+tile);x++){const i=(y*width+x)*3;flow[i]=dx;flow[i+1]=dy;flow[i+2]=energy}
 }
 return flow;
}
export function advectDepth(field,flow,width,height){
 const out=new Float32Array(field.length);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x,j=i*3,sx=Math.max(0,Math.min(width-1,x-flow[j])),sy=Math.max(0,Math.min(height-1,y-flow[j+1])),a=Math.floor(sx),b=Math.floor(sy),tx=sx-a,ty=sy-b;
  const read=(u,v)=>field[Math.min(height-1,v)*width+Math.min(width-1,u)];out[i]=(read(a,b)*(1-tx)+read(a+1,b)*tx)*(1-ty)+(read(a,b+1)*(1-tx)+read(a+1,b+1)*tx)*ty;
 }
 return out;
}
