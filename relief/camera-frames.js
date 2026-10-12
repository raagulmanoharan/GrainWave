// Prefer presented video frames over playback counters, which can stall on
// mobile live streams. Each processing path consumes frames independently.
export class CameraFrames {
 constructor(video){
  this.video=video;this.consumed=new Map();this.presented=0;
  if(video.requestVideoFrameCallback){
   const next=()=>{this.presented++;this.callback=video.requestVideoFrameCallback(next)};
   this.callback=video.requestVideoFrameCallback(next);
  }
 }
 take(consumer,generation){
  const video=this.video;if(video.readyState<2)return false;
  const key=`${generation}:${this.presented||video.currentTime}`;
  if(this.consumed.get(consumer)===key)return false;
  this.consumed.set(consumer,key);return true;
 }
 reset(){this.consumed.clear()}
}
