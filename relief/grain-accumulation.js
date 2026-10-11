// Temporal grain exposure: noisy samples build tone while the camera is steady.
export class GrainAccumulation {
 constructor(){this.reset()}
 reset(time=0){this.values=null;this.counts=null;this.steadySince=time;this.travel=0}
 camera(offset,uncertain,time){
  const distance=Math.hypot(offset?.x||0,offset?.y||0);this.travel=this.travel*.85+distance;
  if(uncertain||distance>.0025||this.travel>.009)this.reset(time);
 }
 prepare(length,time){if(!this.values||this.values.length!==length){this.values=new Float32Array(length);this.counts=new Uint16Array(length);this.steadySince=time}}
 exposure(time){return Math.max(0,Math.min(.88,(time-this.steadySince-600)/4000))}
 sample(index,light,moving){
  if(moving){this.values[index]=light;this.counts[index]=1;return light}
  const count=Math.min(128,this.counts[index]+1);this.counts[index]=count;this.values[index]+=(light-this.values[index])/count;return this.values[index];
 }
}
