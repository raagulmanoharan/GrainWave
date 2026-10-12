import {MotionTracker} from './motion.js?v=motion-clean-1';
const tracker=new MotionTracker({enhance:true});
self.onmessage=({data:d})=>{
 if(d.type==='reset'){tracker.reset();return}
 if(d.type!=='frame')return;
 try{
  const started=performance.now();const sources=tracker.update(d.data,d.width,d.height,d.time,d.maximum,d.sensitivity);
  self.postMessage({type:'result',generation:d.generation,processingMs:performance.now()-started,sources,state:tracker.state,cameraMotion:tracker.cameraMotion,cameraUncertain:tracker.cameraUncertain});
 }catch(e){self.postMessage({type:'error',generation:d.generation,message:e.message})}
};
