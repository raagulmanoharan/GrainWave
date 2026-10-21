// GPU-only preview: one camera upload per new frame, no CPU pixel readback.
export class PixelPreview{
 constructor(canvas){
  this.canvas=canvas;this.ready=false;this.key='';
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.ready=false});
  canvas.addEventListener('webglcontextrestored',()=>this.init());
  this.init();
 }
 init(){
  try{
   const gl=this.canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false});
   if(!gl)return;this.gl=gl;
   const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
   const vs=shader(gl.VERTEX_SHADER,'attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}');
   const fs=shader(gl.FRAGMENT_SHADER,`precision highp float;
uniform sampler2D camera;uniform vec2 resolution;uniform vec2 crop;uniform float block;uniform float brightness;uniform float mirror;uniform float grain;
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*437.585);}
void main(){
 vec2 uv=(floor(gl_FragCoord.xy/block)+.5)*block/resolution;
 uv.y=1.-uv.y;uv.x=mix(uv.x,1.-uv.x,mirror);uv=(uv-.5)*crop+.5;
 vec3 rgb=texture2D(camera,uv).rgb;
 float gray=clamp((dot(rgb,vec3(.2126,.7152,.0722))*brightness-.5)*1.8+.5,0.,1.);
 // Fine grain is added AFTER block sampling, at individual display pixels.
 gray=clamp(gray+(hash(floor(gl_FragCoord.xy))- .5)*grain,0.,1.);
 gl_FragColor=vec4(vec3(gray),1.);
}`);
   const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Preview shader link failed');
   gl.deleteShader(vs);gl.deleteShader(fs);gl.useProgram(program);this.program=program;
   const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
   const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
   this.texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.texture);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   this.uniforms=Object.fromEntries(['resolution','crop','block','brightness','mirror','grain'].map(n=>[n,gl.getUniformLocation(program,n)]));
   this.key='';this.ready=true;
  }catch{this.ready=false}
 }
 draw(source,w,h,depth,mirror=false,grain=.16){
  if(!this.ready)return false;
  const sw=source.videoWidth||source.width,sh=source.videoHeight||source.height;if(!sw||!sh||!w||!h)return false;
  const d=Math.min(devicePixelRatio||1,1.5),width=Math.round(w*d),height=Math.round(h*d);
  const key=[source.currentTime,width,height,depth,mirror,grain].join(':');if(key===this.key)return true;
  try{
   const gl=this.gl,u=this.uniforms;if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height}
   gl.viewport(0,0,width,height);gl.useProgram(this.program);gl.bindTexture(gl.TEXTURE_2D,this.texture);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,source);
   const ratio=(sw/sh)/(w/h);gl.uniform2f(u.crop,Math.min(1,1/ratio),Math.min(1,ratio));
   gl.uniform2f(u.resolution,width,height);gl.uniform1f(u.block,4*d);gl.uniform1f(u.brightness,1.65-depth*.45);gl.uniform1f(u.mirror,mirror?1:0);gl.uniform1f(u.grain,grain);
   gl.drawArrays(gl.TRIANGLES,0,6);this.key=key;return true;
  }catch{this.ready=false;return false}
 }
}
