// Shared preview tone; detector and optical-flow input remain untouched.
export function previewBrightness(depth){return 1.3-depth*.45}
export function previewFilter(depth,mosaic=false){return `grayscale(1) brightness(${previewBrightness(depth)}) contrast(${mosaic?1.9:1.8})${mosaic?' invert(1)':''}`}
export function tonePixels(data,depth,mosaic=false){
 const brightness=previewBrightness(depth);
 for(let i=0;i<data.length;i+=4){
  const gray=(data[i]*.2126+data[i+1]*.7152+data[i+2]*.0722)*brightness;
  const value=Math.max(0,Math.min(255,(gray-127.5)*(mosaic?1.9:1.8)+127.5));
  data[i]=data[i+1]=data[i+2]=mosaic?255-value:value;
 }
}
// A fixed print texture avoids temporal noise/flicker and per-frame pixel work.
export class PrintTexture{
 constructor(){this.pattern=null}
 draw(ctx,w,h){
  if(!this.pattern){
   const tile=document.createElement('canvas');tile.width=tile.height=128;
   const c=tile.getContext('2d'),image=c.createImageData(128,128);let seed=47;
   for(let i=0;i<image.data.length;i+=4){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const white=seed&256;image.data[i]=image.data[i+1]=image.data[i+2]=white?255:0;
    image.data[i+3]=12+(seed>>>24)%26;
   }
   c.putImageData(image,0,0);
   this.pattern=ctx.createPattern(tile,'repeat');
  }
  ctx.save();ctx.fillStyle=this.pattern;ctx.fillRect(0,0,w,h);ctx.restore();
 }
}
