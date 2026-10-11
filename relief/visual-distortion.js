// Bounded frame feedback: distort the displayed image, never the tracking input.
export class VisualDistortion {
 constructor(){this.canvas=document.createElement('canvas');this.ctx=this.canvas.getContext('2d');this.ready=false}
 reset(){this.ready=false}
 draw(ctx,w,h,time,amount){
  if(!amount){this.ready=false;return}
  const width=Math.min(540,Math.round(w)),height=Math.round(width*h/w);
  if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;this.ready=false}
  ctx.save();ctx.imageSmoothingEnabled=false;
  if(this.ready){ctx.globalAlpha=amount*.24;ctx.globalCompositeOperation='screen';const zoom=1+amount*.018;ctx.drawImage(this.canvas,-w*(zoom-1)/2,-h*(zoom-1)/2,w*zoom,h*zoom);
   ctx.globalCompositeOperation='source-over';ctx.globalAlpha=amount*.38;
   // A few narrow displaced bands, instead of covering the scene with a full-frame smear.
   for(let i=0;i<3;i++){const phase=Math.floor(time/100)+i*73,y=((phase*31)%height),bh=Math.max(2,Math.floor(height*.009)),offset=Math.sin(phase*1.7)*amount*w*.025;ctx.drawImage(this.canvas,0,y,width,Math.min(bh,height-y),offset,y/height*h,w,bh/height*h)}
  }
  ctx.restore();this.ctx.clearRect(0,0,width,height);this.ctx.drawImage(ctx.canvas,0,0,width,height);this.ready=true;
 }
}
