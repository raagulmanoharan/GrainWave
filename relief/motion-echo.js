// Visual snapshots share the half-beat spacing and feedback decay of the audio delay.
export class MotionEcho {
 constructor(){this.frames=[];this.pool=[]}
 reset(){for(const frame of this.frames)this.pool.push(frame.image);this.frames=[];this.pool.length=Math.min(8,this.pool.length)}
 capture(source,point,time,bpm){
  const box=point.box||{x:point.x-.065,y:point.y-.075,w:.13,h:.15};
  const x=Math.max(0,box.x-.015),y=Math.max(0,box.y-.015),w=Math.min(1-x,box.w+.03),h=Math.min(1-y,box.h+.03);
  if(w<=0||h<=0||!source.width||!source.height)return;
  const image=this.pool.pop()||document.createElement('canvas'),factor=Math.min(1,320/(w*source.width),320/(h*source.height));
  const width=Math.max(1,Math.round(w*source.width*factor)),height=Math.max(1,Math.round(h*source.height*factor));if(image.width!==width)image.width=width;if(image.height!==height)image.height=height;
  image.getContext('2d').drawImage(source,x*source.width,y*source.height,w*source.width,h*source.height,0,0,image.width,image.height);
  this.frames.push({image,x,y,w,h,time,interval:30000/bpm});if(this.frames.length>8)this.pool.push(this.frames.shift().image);
 }
 draw(ctx,w,h,time,amount,distortion=0){
  let count=0;for(const frame of this.frames){if(time-frame.time<frame.interval*4.3)this.frames[count++]=frame;else this.pool.push(frame.image)}this.frames.length=count;
  amount=Math.min(.6,amount+distortion*.18);if(amount<=0)return;
  ctx.save();ctx.globalCompositeOperation='screen';
  for(const f of this.frames){const age=time-f.time;
   for(let repeat=1;repeat<=3;repeat++){const since=age-repeat*f.interval;if(since<0||since>f.interval*1.2)continue;
    const fade=1-since/(f.interval*1.2);ctx.globalAlpha=Math.min(.7,amount*3.5)*Math.pow(.32+distortion*.2,repeat-1)*fade;
    ctx.drawImage(f.image,f.x*w,f.y*h,f.w*w,f.h*h);
   }
  }
  ctx.restore();
 }
}
