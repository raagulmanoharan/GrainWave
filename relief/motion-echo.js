// Visual snapshots share the half-beat spacing and feedback decay of the audio delay.
export class MotionEcho {
 constructor(){this.frames=[]}
 reset(){this.frames=[]}
 capture(source,point,time,bpm){
  const box=point.box||{x:point.x-.065,y:point.y-.075,w:.13,h:.15};
  const x=Math.max(0,box.x-.015),y=Math.max(0,box.y-.015),w=Math.min(1-x,box.w+.03),h=Math.min(1-y,box.h+.03);
  if(w<=0||h<=0||!source.width||!source.height)return;
  const image=document.createElement('canvas'),factor=Math.min(1,320/(w*source.width),320/(h*source.height));
  image.width=Math.max(1,Math.round(w*source.width*factor));image.height=Math.max(1,Math.round(h*source.height*factor));
  image.getContext('2d').drawImage(source,x*source.width,y*source.height,w*source.width,h*source.height,0,0,image.width,image.height);
  this.frames.push({image,x,y,w,h,time,interval:30000/bpm});if(this.frames.length>24)this.frames.shift();
 }
 draw(ctx,w,h,time,amount){
  this.frames=this.frames.filter(f=>time-f.time<f.interval*4.3);
  if(amount<=0)return;
  ctx.save();ctx.globalCompositeOperation='screen';
  for(const f of this.frames){const age=time-f.time;
   for(let repeat=1;repeat<=3;repeat++){const since=age-repeat*f.interval;if(since<0||since>f.interval*1.2)continue;
    const fade=1-since/(f.interval*1.2);ctx.globalAlpha=Math.min(.7,amount*3.5)*Math.pow(.32,repeat-1)*fade;
    ctx.drawImage(f.image,f.x*w,f.y*h,f.w*w,f.h*h);
   }
  }
  ctx.restore();
 }
}
