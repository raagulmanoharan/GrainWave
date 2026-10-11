export class GrainProcessor{
 process({data,width,height,drive,settled,threshold,playing,boxes=[]}){
  const count=width*height;if(this.count!==count){this.count=count;this.memory=new Float32Array(count);this.noise=new Float32Array(count);this.moving=new Uint8Array(count);for(let j=0;j<count;j++){let hash=j+1;hash=Math.imul(hash^(hash>>>16),0x45d9f3b);hash=Math.imul(hash^(hash>>>16),0x45d9f3b);this.noise[j]=((hash^(hash>>>16))>>>0)/4294967296}}
  this.moving.fill(0);for(const box of boxes){const left=Math.max(0,Math.floor((box.x-.02)*width)),right=Math.min(width,Math.ceil((box.x+box.w+.02)*width)),top=Math.max(0,Math.floor((box.y-.02)*height)),bottom=Math.min(height,Math.ceil((box.y+box.h+.02)*height));for(let y=top;y<bottom;y++)this.moving.fill(1,y*width+left,y*width+right)}
  const cutoff=.12+threshold*.76-settled*.12,strength=.55+settled*.18;
  for(let j=0,i=0;j<count;j++,i+=4){const lum=(data[i]*.2126+data[i+1]*.7152+data[i+2]*.0722)/255,moving=this.moving[j],memory=moving?.06+drive*.025:.3-settled*.18+drive*.2,signal=lum*(1-memory)+this.memory[j]*memory,dark=signal+(this.noise[j]-.5)*strength<cutoff;this.memory[j]=dark?0:1;data[i]=dark?7:playing?237:242;data[i+1]=dark?playing?10:7:playing?229:242;data[i+2]=dark?playing?14:7:playing?211:242;data[i+3]=playing?(moving?238:255-settled*16):255}
  return data;
 }
 reset(){this.memory?.fill(0)}
}
