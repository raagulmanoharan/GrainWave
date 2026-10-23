import {previewBrightness} from './preview-tone.js?v=mosaic-1';
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
uniform sampler2D camera;uniform sampler2D foreground;uniform float useMask;uniform vec2 resolution;uniform vec2 crop;uniform float block;uniform float brightness;uniform float mirror;uniform float grain;uniform vec4 regions[6];uniform int regionCount;uniform float feather;uniform float mosaic;
float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
vec2 cameraUV(vec2 uv){uv.x=mix(uv.x,1.-uv.x,mirror);return (uv-.5)*crop+.5;}
void main(){
 vec2 screen=vec2(gl_FragCoord.x/resolution.x,1.-gl_FragCoord.y/resolution.y);
 float moving=0.;
 for(int i=0;i<6;i++){
  if(i<regionCount){
   vec4 box=regions[i];
   vec2 edge=min(screen-box.xy,box.xy+box.zw-screen)*resolution;
   moving=max(moving,smoothstep(0.,feather,min(edge.x,edge.y)));
  }
 }
 if(useMask>.5)moving=texture2D(foreground,screen).r;
 vec2 blocks=(floor(gl_FragCoord.xy/block)+.5)*block/resolution;blocks.y=1.-blocks.y;
 // Unquantized sampling within motion regions, with a narrow softened boundary.
 vec2 uv=mix(blocks,screen,moving);
 vec3 rgb;
 if(mosaic>.5){
  // Four samples estimate each small cell's tone; retain most original detail.
  vec2 offset=block/resolution*.25;
  vec3 average=(texture2D(camera,cameraUV(blocks+vec2(-offset.x,-offset.y))).rgb+
   texture2D(camera,cameraUV(blocks+vec2(offset.x,-offset.y))).rgb+
   texture2D(camera,cameraUV(blocks+vec2(-offset.x,offset.y))).rgb+
   texture2D(camera,cameraUV(blocks+vec2(offset.x,offset.y))).rgb)*.25;
  float cell=floor(dot(average,vec3(.2126,.7152,.0722))*31.+.5)/31.;
  rgb=mix(texture2D(camera,cameraUV(screen)).rgb,vec3(cell),mix(.35,.2,moving));
 }else rgb=texture2D(camera,cameraUV(uv)).rgb;
 float gray=clamp((dot(rgb,vec3(.2126,.7152,.0722))*brightness-.5)*mix(mix(1.8,1.9,mosaic),2.3,moving)+.5,0.,1.);
 // A soft threshold keeps more tonal detail than a hard black/white cut.
 gray=mix(gray,smoothstep(.25,.75,gray),moving*.2);
 gray=mix(gray,1.-gray,mosaic);
 // Compress background contrast only while a confirmed foreground mask is present.
 gray=mix(gray,.5+(gray-.5)*.55,useMask*(1.-moving)*.85);
 // Per-pixel noise, no repeating dot tile. Add grain after sampling and contrast.
 gray=clamp(gray+(hash(floor(gl_FragCoord.xy))-.5)*(grain+moving*.45),0.,1.);
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
   this.maskTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.maskTexture);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE,1,1,0,gl.LUMINANCE,gl.UNSIGNED_BYTE,new Uint8Array([0]));
   gl.uniform1i(gl.getUniformLocation(program,'foreground'),1);gl.activeTexture(gl.TEXTURE0);this.lastMask=null;
   this.uniforms=Object.fromEntries(['resolution','crop','block','brightness','mirror','grain','regionCount','feather','mosaic','useMask'].map(n=>[n,gl.getUniformLocation(program,n)]));
   this.uniforms.regions=gl.getUniformLocation(program,'regions[0]');this.regionData=new Float32Array(24);this.source=null;this.videoTime=null;
   this.key='';this.ready=true;
  }catch{this.ready=false}
 }
 draw(source,w,h,depth,mirror=false,grain=.16,regions=[],mosaic=false,foreground=null){
  if(!this.ready)return false;
  const sw=source.videoWidth||source.width,sh=source.videoHeight||source.height;if(!sw||!sh||!w||!h)return false;
  const d=Math.min(1,384/w,512/h),width=Math.round(w*d),height=Math.round(h*d);
  const boxes=regions.filter(p=>p.box&&[p.box.x,p.box.y,p.box.w,p.box.h].every(Number.isFinite)&&p.box.w>0&&p.box.h>0).slice(0,6);
  this.regionData.fill(0);boxes.forEach((p,i)=>this.regionData.set([p.box.x,p.box.y,p.box.w,p.box.h],i*4));
  const key=[source.currentTime,width,height,depth,mirror,grain,mosaic,foreground?.time??-1,...this.regionData].join(':');if(source===this.source&&source.currentTime!==undefined&&key===this.key&&foreground===this.lastMask)return true;
  try{
   const gl=this.gl,u=this.uniforms;if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height}
   gl.viewport(0,0,width,height);gl.useProgram(this.program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);
   if(source!==this.source||source.currentTime===undefined||source.currentTime!==this.videoTime){
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,source);this.source=source;this.videoTime=source.currentTime;
   }
   if(foreground&&foreground!==this.lastMask){
    gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.maskTexture);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE,foreground.width,foreground.height,0,gl.LUMINANCE,gl.UNSIGNED_BYTE,foreground.data);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT,4);gl.activeTexture(gl.TEXTURE0);
   }
   this.lastMask=foreground;gl.uniform1f(u.useMask,foreground?1:0);
   const ratio=(sw/sh)/(w/h);gl.uniform2f(u.crop,Math.min(1,1/ratio),Math.min(1,ratio));
   gl.uniform2f(u.resolution,width,height);gl.uniform1f(u.block,(mosaic?5:4)*d);gl.uniform1f(u.brightness,previewBrightness(depth));gl.uniform1f(u.mirror,mirror?1:0);gl.uniform1f(u.grain,grain);
   gl.uniform4fv(u.regions,this.regionData);gl.uniform1i(u.regionCount,boxes.length);gl.uniform1f(u.feather,3*d);
   gl.uniform1f(u.mosaic,mosaic?1:0);
   gl.drawArrays(gl.TRIANGLES,0,6);this.key=key;return true;
  }catch{this.ready=false;return false}
 }
}
