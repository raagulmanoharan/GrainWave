// A loop is armed by played notes, and starts after five visually quiet seconds.
export class VisualLoop {
 constructor(){this.reset()}
 reset(time=0){this.changedAt=time;this.signature=null;this.looping=false;this.points=new Map()}
 movement(time,replace=false){if(this.looping&&replace)this.points.clear();this.changedAt=time;this.looping=false}
 remember(point){this.points.delete(point.id);this.points.set(point.id,{...point,box:point.box?{...point.box}:undefined});while(this.points.size>6)this.points.delete(this.points.keys().next().value)}
 frame(data,w,h,time){
  const v=[];for(let y=0;y<8;y++)for(let x=0;x<8;x++){const i=(Math.min(h-1,Math.floor((y+.5)*h/8))*w+Math.min(w-1,Math.floor((x+.5)*w/8)))*4;v.push((data[i]*.2126+data[i+1]*.7152+data[i+2]*.0722)/255)}
  const mean=v.reduce((a,b)=>a+b)/64;for(let i=0;i<64;i++)v[i]-=mean;
  if(!this.signature){this.signature=v;this.changedAt=time;return}
  let changed=0;for(let i=0;i<64;i++)if(Math.abs(v[i]-this.signature[i])>.045)changed++;
  if(changed>=4){this.movement(time);this.signature=v}
 }
 progress(time,armed){if(!armed)return 0;const value=Math.max(0,Math.min(1,(time-this.changedAt)/5000));this.looping=value===1;return value}
}
