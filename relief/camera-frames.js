// Each consumer analyses a decoded camera frame at most once. Audio and drawing
// remain free to run between frames, including on low-frame-rate cameras.
export class CameraFrames {
 constructor(video){this.video=video;this.consumed=new Map()}
 take(consumer,generation){
  const video=this.video;if(video.readyState<2)return false;
  const decoded=video.getVideoPlaybackQuality?.().totalVideoFrames;
  const key=`${generation}:${decoded>0?decoded:video.currentTime}`;
  if(this.consumed.get(consumer)===key)return false;
  this.consumed.set(consumer,key);return true;
 }
 reset(){this.consumed.clear()}
}
