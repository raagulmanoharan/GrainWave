const vertex=`#version 300 es
precision highp float;
uniform sampler2D uImage,uMap;uniform float uAspect;uniform vec2 uGrid;uniform float uDepth,uTime;uniform vec2 uSize;
out vec2 vFace;out vec3 vColor;out float vLight,vHeight,vNoise;
float luma(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
void main(){
 int column=gl_InstanceID%int(uGrid.x),row=gl_InstanceID/int(uGrid.x);
 vec2 uv=(vec2(column,row)+.5)/uGrid;
 vec3 color=texture(uImage,uv).rgb;
 float field=texture(uMap,uv).r;
 float noise=fract(sin(float(column)*17.1+float(row)*3.71)*43758.5453);
 // Relative inverse depth: nearby samples have a larger value.
 float z=2.0+(1.-field)*1.15;
 vec3 point=vec3((uv.x-.5)*2.*uAspect*z/2.8,(.5-uv.y)*2.*z/2.8,z);
 vec2 corners[6]=vec2[6](vec2(0,0),vec2(1,0),vec2(0,1),vec2(0,1),vec2(1,0),vec2(1,1));
 vec2 q=corners[gl_VertexID];vFace=q;
 float height=2./uGrid.y+uDepth*(.015+field*.32);
 point.y+=(1.-q.y)*height;
 point.x+=(q.x-.5)*2.*uAspect/uGrid.x;
 // Small lateral viewpoint exposes the depth relief without changing the source.
 // Keep the source-space anchors aligned with the musical tracking overlay.
 vColor=color;vHeight=field;vNoise=noise;vLight=.8;
 gl_Position=vec4(point.x/uAspect,point.y,(point.z-2.)*.25,point.z/2.8);
}`;
const fragment=`#version 300 es
precision highp float;
in vec2 vFace;in vec3 vColor;in float vLight,vHeight,vNoise;out vec4 fragColor;
void main(){
 float l=dot(vColor,vec3(.2126,.7152,.0722));
 vec3 shadow=vec3(.055,.003,.009),red=vec3(.66,.065,.018),copper=vec3(1.,.39,.13);
 float face=pow(1.-vFace.y,.65);float side=.58+.42*sin(vFace.x*3.14159);
 float tone=clamp(pow(l,.8),0.,1.);
 vec3 base=mix(shadow,red,tone)*(.45+face*.55)*side*(.65+vLight*.5);
 float cap=1.-smoothstep(.025,.085,vFace.y);base=mix(base,copper*(.4+.6*tone),cap*.4*smoothstep(.15,.85,vNoise));
 float edge=pow(1.-abs(vFace.x*2.-1.),5.);base+=red*edge*.08;
 fragColor=vec4(base,1.);
}`;

export class DepthCloud {
 constructor(canvas,onStatus=()=>{}) {
  this.canvas=canvas;this.onStatus=onStatus;this.generation=0;this.ready=false;this.busy=false;this.failed=false;this.last=0;this.lastDraw=0;this.maps=0;
  const gl=this.gl=canvas.getContext('webgl2',{alpha:false,antialias:false});
  if(!gl){this.failed=true;onStatus('Depth visual unavailable · showing camera');return}
  const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader};
  const program=this.program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);gl.bindVertexArray(gl.createVertexArray());gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
  this.uniforms=Object.fromEntries(['uImage','uMap','uGrid','uDepth','uTime','uSize','uAspect'].map(n=>[n,gl.getUniformLocation(program,n)]));
  this.textures=[0,1].map(i=>{gl.activeTexture(gl.TEXTURE0+i);const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);for(const [key,value] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,key,value);return texture});gl.uniform1i(this.uniforms.uImage,0);gl.uniform1i(this.uniforms.uMap,1);
  this.capture=document.createElement('canvas');this.context=this.capture.getContext('2d',{willReadFrequently:true});
  this.worker=new Worker(new URL('./effect-preview/depth-worker.js',import.meta.url),{type:'module'});
  this.worker.onmessage=({data})=>{
   if(data.status){onStatus('Preparing depth visual…');return}
   this.busy=false;if(data.id!==this.generation)return;
   if(data.error){this.failed=true;onStatus('Depth unavailable · showing camera');return}
   gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.textures[1]);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.texImage2D(gl.TEXTURE_2D,0,gl.R8,data.width,data.height,0,gl.RED,gl.UNSIGNED_BYTE,new Uint8Array(data.pixels));this.ready=true;this.maps++;onStatus('');
  };
  this.worker.onerror=()=>{this.busy=false;this.failed=true;onStatus('Depth unavailable · showing camera')};
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.ready=false;this.failed=true;this.worker.terminate();onStatus('Depth unavailable · showing camera')});
 }
 reset(){this.generation++;this.ready=false;this.canvas.hidden=true;}
 update(time,video,drawCamera,stretch){
  if(!this.gl||this.failed||video.readyState<2||document.hidden)return false;
  const gl=this.gl,c=this.canvas,r=c.parentElement.getBoundingClientRect(),d=Math.min(devicePixelRatio,1.25);
  const width=Math.max(1,Math.round(r.width*d)),height=Math.max(1,Math.round(r.height*d));
  if(c.width!==width||c.height!==height){c.width=width;c.height=height;gl.viewport(0,0,width,height)}
  // Never queue depth jobs or delay the independent music/motion pipeline.
  if(!this.busy&&time-this.last>200){this.busy=true;this.last=time;this.capture.width=320;this.capture.height=Math.round(320*height/width);drawCamera(this.context,this.capture.width,this.capture.height);const frame=this.context.getImageData(0,0,this.capture.width,this.capture.height);this.worker.postMessage({id:this.generation,width:frame.width,height:frame.height,pixels:frame.data.buffer},[frame.data.buffer]);}
  if(!this.ready)return false;
  if(time-this.lastDraw<33)return true;this.lastDraw=time;
  // The texture uses the same cover crop and mirror setting as tracking.
  this.capture.width=320;this.capture.height=Math.round(320*height/width);drawCamera(this.context,this.capture.width,this.capture.height);
  gl.useProgram(this.program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.textures[0]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,this.capture);
  const cols=180,rows=Math.round(cols*height/width);gl.uniform2f(this.uniforms.uGrid,cols,rows);gl.uniform1f(this.uniforms.uAspect,width/height);gl.uniform1f(this.uniforms.uDepth,stretch);gl.uniform1f(this.uniforms.uTime,time*.001);gl.uniform2f(this.uniforms.uSize,this.capture.width,this.capture.height);gl.clearColor(.06,.005,.009,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.drawArraysInstanced(gl.TRIANGLES,0,6,cols*rows);c.hidden=false;return true;
 }
}
