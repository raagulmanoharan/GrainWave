// Free Apache-2.0 TensorFlow.js / COCO-SSD. Images stay in this browser worker.
let model=null,busy=false;
async function boot(){
 try{
  importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js');
  importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.22.0/dist/tf-backend-wasm.min.js');
  tf.wasm.setWasmPaths('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.22.0/dist/');
  tf.env().set('WASM_HAS_MULTITHREAD_SUPPORT',false);
  if(!await tf.setBackend('wasm'))throw Error('WASM unavailable');await tf.ready();
  importScripts('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js');
  model=await cocoSsd.load({base:'lite_mobilenet_v2'});
  self.postMessage({type:'ready'});
 }catch(e){self.postMessage({type:'unavailable',message:String(e)})}
}
self.onmessage=async({data:d})=>{
 if(d.type!=='frame'||!model||busy)return;
 busy=true;let input;
 try{
  const started=performance.now(),rgb=new Int32Array(d.width*d.height*3);
  for(let i=0,j=0;i<d.data.length;i+=4){rgb[j++]=d.data[i];rgb[j++]=d.data[i+1];rgb[j++]=d.data[i+2]}
  input=tf.tensor3d(rgb,[d.height,d.width,3],'int32');
  const predictions=await model.detect(input,20,.55);
  self.postMessage({type:'result',predictions:predictions.map(p=>({class:p.class,score:p.score,box:{x:p.bbox[0]/d.width,y:p.bbox[1]/d.height,w:p.bbox[2]/d.width,h:p.bbox[3]/d.height}})),time:d.time,generation:d.generation,processingMs:performance.now()-started});
 }catch(e){self.postMessage({type:'error',generation:d.generation,message:String(e)})}
 finally{input?.dispose();busy=false}
};
boot();
