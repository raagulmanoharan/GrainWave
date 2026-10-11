const fonts=[['R','ReliefBlackletter','normal',400],['E','ReliefSerif','italic',600],['L','Arial','normal',400],['I','ReliefSerif','normal',600],['E','ReliefPixel','normal',400],['F','Georgia','normal',400]];
export class LandingType{
 constructor(){this.canvas=document.getElementById('landing-type');this.ctx=this.canvas.getContext('2d');this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.open=true;this.start=performance.now();this.ready=false;Promise.all([document.fonts.load('80px ReliefBlackletter'),document.fonts.load('600 80px ReliefSerif'),document.fonts.load('italic 600 80px ReliefSerif'),document.fonts.load('80px ReliefPixel')]).then(()=>document.fonts.ready).then(()=>{this.ready=true;this.start=performance.now();this.tick()});window.addEventListener('resize',()=>{this.resize();if(this.ready&&!this.frame)this.tick()});this.resize()}
 resize(){this.w=innerWidth;this.h=innerHeight;this.d=Math.min(devicePixelRatio,2);this.canvas.width=this.w*this.d;this.canvas.height=this.h*this.d}
 setPlaying(playing){this.open=!playing;this.start=performance.now();this.canvas.hidden=false;if(this.ready&&!this.frame)this.tick()}
 tick=()=>{this.frame=null;const elapsed=performance.now()-this.start,duration=this.reduced?1:850,p=Math.min(1,elapsed/duration),ease=1-(1-p)**3,spread=this.open?ease:1-ease;
 const {ctx,w,h,d}=this;ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,w,h);
 if(!this.open&&p===1){this.canvas.hidden=true;return}
 // Fit visible ink, not em boxes: every glyph has the same optical height.
 const measure=height=>fonts.map(([char,family,style,weight])=>{
  ctx.font=`${style} ${weight} 100px ${family}`;const base=ctx.measureText(char),size=100*height/(base.actualBoundingBoxAscent+base.actualBoundingBoxDescent);
  const font=`${style} ${weight} ${size}px ${family}`;ctx.font=font;const m=ctx.measureText(char);
  return {char,font,width:m.actualBoundingBoxLeft+m.actualBoundingBoxRight,left:m.actualBoundingBoxLeft,ascent:m.actualBoundingBoxAscent,height:m.actualBoundingBoxAscent+m.actualBoundingBoxDescent};
 });
 let height=Math.min(w*.23,160),glyphs=measure(height),gap=height*.012;
 let width=glyphs.reduce((n,g)=>n+g.width,0)+gap*(glyphs.length-1);
 if(width>w*.91){height*=w*.91/width;glyphs=measure(height);gap=height*.012;width=glyphs.reduce((n,g)=>n+g.width,0)+gap*(glyphs.length-1)}
 const top=(h-height)/2,spacing=Math.min(h*.14,height*1.65);
 ctx.save();
 if(!this.open&&p>.58){const dissolve=(p-.58)/.42,bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];ctx.beginPath();for(let y=0;y<h;y+=5)for(let x=0;x<w;x+=5){if(bayer[(y/5%4)*4+(x/5%4)]/16>=dissolve)ctx.rect(x,y,5,5)}ctx.clip()}
 for(let row=-3;row<=3;row++){ctx.globalAlpha=row===0?1:(.38-Math.abs(row)*.055)*Math.min(1,spread*3);ctx.strokeStyle='#fff';ctx.fillStyle='#fff';ctx.lineWidth=.8;ctx.textBaseline='alphabetic';let x=(w-width)/2;for(const glyph of glyphs){ctx.font=glyph.font;if(row===0)ctx.fillText(glyph.char,x+glyph.left,top+glyph.ascent);else ctx.strokeText(glyph.char,x+glyph.left,top+glyph.ascent+row*spacing*spread);x+=glyph.width+gap}}
 ctx.restore();if(p<1)this.frame=requestAnimationFrame(this.tick)
 }
}
