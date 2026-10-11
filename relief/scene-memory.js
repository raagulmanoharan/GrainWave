// Compare spatial luminance structure, ignoring a uniform exposure change.
export class SceneMemory {
 constructor(){this.reference=null;this.candidate=null;this.since=0;this.lastCheck=0}
 reset(){this.reference=null;this.candidate=null;this.since=0;this.lastCheck=0}
 sample(data,w,h,time){
  if(time-this.lastCheck<160)return false;this.lastCheck=time;
  const v=[];for(let y=0;y<8;y++)for(let x=0;x<8;x++){const px=Math.min(w-1,Math.floor((x+.5)*w/8)),py=Math.min(h-1,Math.floor((y+.5)*h/8)),i=(py*w+px)*4;v.push((data[i]*.2126+data[i+1]*.7152+data[i+2]*.0722)/255)}
  const mean=v.reduce((a,b)=>a+b)/v.length;for(let i=0;i<v.length;i++)v[i]-=mean;
  if(!this.reference){this.reference=v;return false}
  const distance=(a,b)=>{let n=0;for(let i=0;i<a.length;i++)if(Math.abs(a[i]-b[i])>.14)n++;return n/a.length};
  if(distance(v,this.reference)<.45){this.candidate=null;this.since=0;return false}
  if(!this.candidate||distance(v,this.candidate)>.25){this.candidate=v;this.since=time;return false}
  if(time-this.since<650)return false;this.reference=v;this.candidate=null;this.since=0;return true;
 }
}
