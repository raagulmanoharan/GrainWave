let estimator;
self.onmessage=async({data})=>{
 try {
  if(!estimator){
   postMessage({status:'Loading depth model · first run downloads weights…'});
   const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2/dist/transformers.min.js');
   env.allowLocalModels=false;
   let device='wasm';try{if(await navigator.gpu?.requestAdapter())device='webgpu'}catch{}
   try{estimator=await pipeline('depth-estimation','onnx-community/depth-anything-v2-small',{device,dtype:'q8'})}catch(e){if(device==='wasm')throw e;estimator=await pipeline('depth-estimation','onnx-community/depth-anything-v2-small',{device:'wasm',dtype:'q8'})}
   // Smaller, multiple-of-14 model input trades fine detail for live responsiveness.
   estimator.processor.image_processor.size={height:252,width:252};
  }
  const {RawImage}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2/dist/transformers.min.js');
  const start=performance.now();
  const {depth}=await estimator(new RawImage(new Uint8ClampedArray(data.pixels),data.width,data.height,4));
  const pixels=new Uint8Array(depth.width*depth.height);
  for(let i=0;i<pixels.length;i++)pixels[i]=depth.data[i*depth.channels];
  postMessage({id:data.id,width:depth.width,height:depth.height,pixels:pixels.buffer,ms:performance.now()-start},[pixels.buffer]);
 }catch(e){postMessage({id:data.id,error:e.message})}
};
