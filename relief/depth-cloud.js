import {motionFlow,advectDepth} from './motion-depth.js?v=mosh-1';
const vertex=`#version 300 es
precision highp float;
uniform sampler2D uImage,uMap,uFlow;uniform float uAspect;uniform vec2 uGrid;uniform float uDepth,uTime;uniform vec2 uSize;
out vec2 vFace;out vec3 vColor;out float vLight,vHeight,vNoise,vKeep;
float luma(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
void main(){
 int column=gl_InstanceID%int(uGrid.x),row=gl_InstanceID/int(uGrid.x);
 vec2 uv=(vec2(column,row)+.5)/uGrid;
 vec3 flow=texture(uFlow,uv).rgb;
 vec2 velocity=(flow.rg*255.-128.)/32.;
 vec3 color=texture(uImage,clamp(uv-velocity/uSize*2.,vec2(0),vec2(1))).rgb;
 // Select local contrast, not absolute brightness: dark birds survive against sky.
 vec2 pixel=2./uSize;float center=luma(texture(uImage,uv).rgb);
 float contrast=max(max(abs(center-luma(texture(uImage,uv+vec2(pixel.x,0)).rgb)),abs(center-luma(texture(uImage,uv-vec2(pixel.x,0)).rgb))),max(abs(center-luma(texture(uImage,uv+vec2(0,pixel.y)).rgb)),abs(center-luma(texture(uImage,uv-vec2(0,pixel.y)).rgb))));
 vKeep=(contrast>.14||(flow.b>.12&&contrast>.045))?1.:0.;
 float field=texture(uMap,uv).r;
 float noise=fract(sin(float(column)*17.1+float(row)*3.71)*43758.5453);
 // Relative inverse depth: nearby samples have a larger value.
 float z=2.0+(1.-field)*1.15;
 vec3 point=vec3((uv.x-.5)*2.*uAspect*z/2.8,(.5-uv.y)*2.*z/2.8,z);
 vec2 corners[6]=vec2[6](vec2(0,0),vec2(1,0),vec2(0,1),vec2(0,1),vec2(1,0),vec2(1,1));
 vec2 q=corners[gl_VertexID];vFace=q;
 float height=2./uGrid.y+uDepth*(.003+field*.055);
 height+=flow.b*uDepth*.025;
 point.y+=(1.-q.y)*height;
 point.x+=velocity.x/uSize.x*(1.-q.y)*2.;
 point.x+=(q.x-.5)*2.*uAspect/uGrid.x;
 // Small lateral viewpoint exposes the depth relief without changing the source.
 // Keep the source-space anchors aligned with the musical tracking overlay.
 vColor=color;vHeight=field;vNoise=noise;vLight=.8;
 gl_Position=vec4(point.x/uAspect,point.y,(point.z-2.)*.25,point.z/2.8);
}`;
const fragment=`#version 300 es
precision highp float;
in vec2 vFace;in vec3 vColor;in float vLight,vHeight,vNoise,vKeep;out vec4 fragColor;
void main(){
 if(vKeep<.5)discard;
 float l=dot(vColor,vec3(.2126,.7152,.0722));
 vec3 shadow=vec3(.055,.003,.009),red=vec3(.66,.065,.018),copper=vec3(1.,.39,.13);
 float face=pow(1.-vFace.y,.65);float side=.58+.42*sin(vFace.x*3.14159);
 float tone=clamp(pow(l,.8),0.,1.);
 vec3 base=mix(shadow,red,tone)*(.45+face*.55)*side*(.65+vLight*.5);
 float cap=1.-smoothstep(.025,.085,vFace.y);base=mix(base,copper*(.4+.6*tone),cap*.4*smoothstep(.15,.85,vNoise));
 float edge=pow(1.-abs(vFace.x*2.-1.),5.);base+=red*edge*.08;
 fragColor=vec4(mix(base,vec3(1.,.74,.43),.35),.85);
}`;

export class DepthCloud {
 constructor(canvas,onStatus=()=>{}) {
  this.canvas=canvas;this.onStatus=onStatus;this.generation=0;this.ready=false;this.busy=false;this.failed=false;this.last=0;this.lastDraw=0;this.maps=0;
  const gl=this.gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:false});
  if(!gl){this.failed=true;onStatus('Depth visual unavailable · showing camera');return}
  const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader};
  const program=this.program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);gl.bindVertexArray(gl.createVertexArray());gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
  this.uniforms=Object.fromEntries(['uImage','uMap','uFlow','uGrid','uDepth','uTime','uSize','uAspect'].map(n=>[n,gl.getUniformLocation(program,n)]));
  this.textures=[0,1,2].map(i=>{gl.activeTexture(gl.TEXTURE0+i);const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);for(const [key,value] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,key,value);return texture});gl.uniform1i(this.uniforms.uImage,0);gl.uniform1i(this.uniforms.uMap,1);gl.uniform1i(this.uniforms.uFlow,2);
  this.capture=document.createElement('canvas');this.context=this.capture.getContext('2d',{willReadFrequently:true});
  this.worker=new Worker(new URL('./effect-preview/depth-worker.js',import.meta.url),{type:'module'});
  this.worker.onmessage=({data})=>{
   if(data.status){onStatus('Preparing depth visual…');return}
   this.busy=false;if(data.id!==this.generation)return;
   if(data.error){this.failed=true;onStatus('Depth unavailable · showing camera');return}
   if(!this.flowWidth)return;
   const raw=new Uint8Array(data.pixels),w=this.flowWidth,h=this.flowHeight;
   let target=new Float32Array(w*h);
   for(let y=0;y<h;y++)for(let x=0;x<w;x++)target[y*w+x]=raw[Math.min(data.height-1,Math.floor(y*data.height/h))*data.width+Math.min(data.width-1,Math.floor(x*data.width/w))]/255;
   // Bring the prediction from its captured frame to the current camera frame.
   for(const item of this.history)if(item.serial>this.requestSerial)target=advectDepth(target,item.flow,w,h);
   this.target=target;if(!this.field)this.field=target.slice();
   this.ready=true;this.maps++;onStatus('');
  };
  this.worker.onerror=()=>{this.busy=false;this.failed=true;onStatus('Depth unavailable · showing camera')};
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.ready=false;this.failed=true;this.worker.terminate();onStatus('Depth unavailable · showing camera')});
 }
 restart(){
  const onmessage=this.worker.onmessage,onerror=this.worker.onerror;this.worker.terminate();
  const url=new URL('./effect-preview/depth-worker.js',import.meta.url);url.searchParams.set('wasm','1');
  this.worker=new Worker(url,{type:'module'});this.worker.onmessage=onmessage;this.worker.onerror=onerror;
  this.generation++;this.busy=false;this.last=0;this.retried=true;this.onStatus('Refreshing depth · motion visual stays live');
 }
 reset(){this.generation++;this.ready=false;this.field=null;this.target=null;this.previous=null;this.history=[];this.canvas.hidden=true;}
 update(time,video,drawCamera,stretch){
  if(!this.gl||this.failed||video.readyState<2||document.hidden)return false;
  if(this.busy&&!this.retried&&time-this.last>(this.maps?15000:60000))this.restart();
  const gl=this.gl,c=this.canvas,r=c.parentElement.getBoundingClientRect(),d=Math.min(devicePixelRatio,1.25);
  const width=Math.max(1,Math.round(r.width*d)),height=Math.max(1,Math.round(r.height*d));
  if(c.width!==width||c.height!==height){c.width=width;c.height=height;gl.viewport(0,0,width,height)}
  if(time-this.lastDraw<33)return this.ready;this.lastDraw=time;
  const fh=Math.min(128,Math.round(80*height/width)),fw=Math.max(1,Math.round(fh*width/height));
  if(this.flowWidth!==fw||this.flowHeight!==fh){this.reset();this.flowWidth=fw;this.flowHeight=fh;this.serial=0;this.history=[];}
  this.capture.width=fw;this.capture.height=fh;drawCamera(this.context,fw,fh);
  const rgba=this.context.getImageData(0,0,fw,fh).data,gray=new Uint8Array(fw*fh);
  for(let i=0;i<gray.length;i++)gray[i]=rgba[i*4]*.299+rgba[i*4+1]*.587+rgba[i*4+2]*.114;
  const flow=motionFlow(this.previous,gray,fw,fh);this.previous=gray;this.serial++;
  this.history.push({serial:this.serial,flow});if(this.history.length>90)this.history.shift();
  if(this.field){this.field=advectDepth(this.field,flow,fw,fh);this.target=advectDepth(this.target,flow,fw,fh);for(let i=0;i<this.field.length;i++)this.field[i]+=(this.target[i]-this.field[i])*.12;}
  // Never queue depth jobs or delay the independent music/motion pipeline.
  if(!this.busy&&time-this.last>200){this.busy=true;this.last=time;this.requestSerial=this.serial;this.capture.width=320;this.capture.height=Math.round(320*height/width);drawCamera(this.context,this.capture.width,this.capture.height);const frame=this.context.getImageData(0,0,this.capture.width,this.capture.height);this.worker.postMessage({id:this.generation,width:frame.width,height:frame.height,pixels:frame.data.buffer},[frame.data.buffer]);}
  if(!this.ready)return false;

  // The texture uses the same cover crop and mirror setting as tracking.
  this.capture.width=320;this.capture.height=Math.round(320*height/width);drawCamera(this.context,this.capture.width,this.capture.height);
  const depths=new Uint8Array(fw*fh),vectors=new Uint8Array(fw*fh*4);
  for(let i=0;i<depths.length;i++){depths[i]=Math.round(this.field[i]*255);vectors[i*4]=Math.round(128+flow[i*3]*32);vectors[i*4+1]=Math.round(128+flow[i*3+1]*32);vectors[i*4+2]=Math.round(flow[i*3+2]*255);vectors[i*4+3]=255;}
  gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.textures[1]);gl.texImage2D(gl.TEXTURE_2D,0,gl.R8,fw,fh,0,gl.RED,gl.UNSIGNED_BYTE,depths);
  gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,this.textures[2]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,fw,fh,0,gl.RGBA,gl.UNSIGNED_BYTE,vectors);
  gl.useProgram(this.program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.textures[0]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,this.capture);
  const cols=220,rows=Math.round(cols*height/width);gl.uniform2f(this.uniforms.uGrid,cols,rows);gl.uniform1f(this.uniforms.uAspect,width/height);gl.uniform1f(this.uniforms.uDepth,stretch);gl.uniform1f(this.uniforms.uTime,time*.001);gl.uniform2f(this.uniforms.uSize,this.capture.width,this.capture.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.drawArraysInstanced(gl.TRIANGLES,0,6,cols*rows);c.hidden=false;c.dataset.depthMaps=this.maps;c.dataset.motion=flow.reduce((sum,v,i)=>sum+(i%3===2?v:0),0).toFixed(2);return true;
 }
}
