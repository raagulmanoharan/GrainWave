import {GrainProcessor} from './grain-process.js?v=fine-1';
const grain=new GrainProcessor();
self.onmessage=({data:frame})=>{if(frame.type==='reset'){grain.reset();return}const data=grain.process(frame);self.postMessage({data,width:frame.width,height:frame.height,generation:frame.generation},[data.buffer])};
