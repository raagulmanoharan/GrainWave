import {MotionTracker} from './motion.js?v=instant-1';
const tracker=new MotionTracker();
self.onmessage=({data:d})=>{
 if(d.type==='reset'){tracker.reset();return}
 if(d.type!=='frame')return;
 try{
  const sources=tracker.update(d.data,d.width,d.height,d.time,d.maximum,d.sensitivity);
  self.postMessage({type:'result',generation:d.generation,sources,state:tracker.state,cameraMotion:tracker.cameraMotion,cameraUncertain:tracker.cameraUncertain});
 }catch(e){self.postMessage({type:'error',generation:d.generation,message:e.message})}
};
