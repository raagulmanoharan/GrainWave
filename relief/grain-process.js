const clamp=(value,low=0,high=1)=>Math.max(low,Math.min(high,value));
export class GrainProcessor{
 process({data,width,height,drive=0,threshold=.65,playing=false,boxes=[]}){
  const count=width*height;
  if(this.width!==width||this.height!==height){
   this.width=width;this.height=height;this.focus=new Float32Array(count);this.mask=new Float32Array(count);this.noise=new Float32Array(count);
   for(let j=0;j<count;j++){let hash=j+1;hash=Math.imul(hash^(hash>>>16),0x45d9f3b);hash=Math.imul(hash^(hash>>>16),0x45d9f3b);this.noise[j]=((hash^(hash>>>16))>>>0)/4294967296}
  }
  this.mask.fill(0);
  // Feather motion regions so overlapping tracks never create bright rectangles.
  if(playing)for(const box of boxes){
   if(![box.x,box.y,box.w,box.h].every(Number.isFinite)||box.w<=0||box.h<=0)continue;
   const feather=Math.max(3,Math.min(width,height)*.025),x0=box.x*width,y0=box.y*height,x1=(box.x+box.w)*width,y1=(box.y+box.h)*height;
   const left=Math.max(0,Math.floor(x0-feather)),right=Math.min(width,Math.ceil(x1+feather)),top=Math.max(0,Math.floor(y0-feather)),bottom=Math.min(height,Math.ceil(y1+feather));
   for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
    const distance=Math.max(x0-x,x-x1,y0-y,y-y1,0),t=clamp(1-distance/feather),weight=t*t*(3-2*t),j=y*width+x;
    this.mask[j]=Math.max(this.mask[j],weight);
   }
  }
  const exposure=(.65-clamp(threshold))*.65;
  for(let j=0,i=0;j<count;j++,i+=4){
   const target=this.mask[j],previous=this.focus[j];
   const focus=this.focus[j]=playing?previous+(target-previous)*(target>previous?.65:.28):0;
   const lum=(data[i]*.2126+data[i+1]*.7152+data[i+2]*.0722)/255;
   // Lift shadows without making every dark pixel indistinguishable from black.
   const signal=clamp(Math.pow(lum,.72)+exposure);
   const background=playing?.76:1,detail=background+(1-background)*focus;
   const grain=(this.noise[j]-.5)*(.035+clamp(drive)*.035)*(1-focus*.8);
   const value=clamp(signal*detail+focus*.035+grain);
   data[i]=Math.round(7+value*235);data[i+1]=Math.round(7+value*(playing?226:235));data[i+2]=Math.round(7+value*(playing?211:235));data[i+3]=255;
  }
  return data;
 }
 reset(){this.focus?.fill(0);this.mask?.fill(0)}
}
