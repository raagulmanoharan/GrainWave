// Cached fine grain, clipped to the union of confirmed OpenCV regions.
export class MotionGrain{
 constructor(){this.pattern=null}
 draw(ctx,w,h,regions,time){
  const boxes=regions.filter(p=>p.confirmed&&p.box&&time-p.time<300).slice(0,6);
  if(!boxes.length)return;
  if(!this.pattern){
   const tile=document.createElement('canvas');tile.width=tile.height=128;
   const c=tile.getContext('2d'),pixels=c.createImageData(128,128);let seed=97;
   for(let i=0;i<pixels.data.length;i+=4){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const value=seed&256?255:0;
    pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;pixels.data[i+3]=40+(seed>>>24)%90;
   }
   c.putImageData(pixels,0,0);this.pattern=ctx.createPattern(tile,'repeat');
  }
  ctx.save();ctx.beginPath();
  for(const p of boxes){const b=p.box;const x=Math.max(0,Math.floor(b.x*w/4)*4),y=Math.max(0,Math.floor(b.y*h/4)*4);const right=Math.min(w,Math.ceil((b.x+b.w)*w/4)*4),bottom=Math.min(h,Math.ceil((b.y+b.h)*h/4)*4);if(right>x&&bottom>y)ctx.rect(x,y,right-x,bottom-y)}
  ctx.clip();ctx.fillStyle=this.pattern;ctx.fillRect(0,0,w,h);ctx.restore();
 }
}
