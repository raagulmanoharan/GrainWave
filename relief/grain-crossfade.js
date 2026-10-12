// Display-only blending. Never used by tracking, audio or motion analysis.
export class GrainCrossfade{
 constructor(createCanvas=()=>document.createElement('canvas'),duration=30){this.previous=createCanvas();this.context=this.previous.getContext('2d');this.duration=duration;this.reset()}
 reset(){this.valid=false;this.changedAt=-Infinity;this.generation=null}
 capture(current,time,generation){this.valid=this.generation===generation&&current.width>0&&current.height>0;if(this.valid){if(this.previous.width!==current.width||this.previous.height!==current.height){this.previous.width=current.width;this.previous.height=current.height}this.context.clearRect(0,0,current.width,current.height);this.context.drawImage(current,0,0)}this.generation=generation;this.changedAt=time}
 draw(context,current,width,height,time){const blend=Math.max(0,Math.min(1,(time-this.changedAt)/this.duration));context.save();context.imageSmoothingEnabled=false;if(this.valid&&blend<1){context.drawImage(this.previous,0,0,width,height);context.globalAlpha*=blend}context.drawImage(current,0,0,width,height);context.restore()}
}
