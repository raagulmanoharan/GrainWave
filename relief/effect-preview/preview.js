const $=id=>document.getElementById(id),canvas=$('surface'),overlay=$('lines'),ctx=overlay.getContext('2d'),gl=canvas.getContext('webgl2',{antialias:true,alpha:false,preserveDrawingBuffer:true});
if(!gl){$('state').textContent='This preview requires WebGL 2.';throw Error('WebGL 2 unavailable')}
const vertex=`#version 300 es
precision highp float;
uniform sampler2D uImage;uniform vec2 uGrid;uniform float uDepth,uTime;uniform vec2 uSize;
out vec2 vFace;out vec3 vColor;out float vLight,vHeight,vNoise;
float luma(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
void main(){
 int column=gl_InstanceID%int(uGrid.x),row=gl_InstanceID/int(uGrid.x);
 vec2 uv=(vec2(column,row)+.5)/uGrid;
 vec3 color=texture(uImage,uv).rgb;float l=luma(color);
 vec2 texel=1./uSize;float left=luma(texture(uImage,uv-vec2(texel.x*2.,0)).rgb),right=luma(texture(uImage,uv+vec2(texel.x*2.,0)).rgb);
 float saturation=max(max(color.r,color.g),color.b)-min(min(color.r,color.g),color.b);
 float field=clamp(.12+.72*(1.-l)+.24*saturation,0.,1.);
 float noise=fract(sin(float(column)*17.1+float(row)*3.71)*43758.5453);
 float wave=sin(uv.y*17.+uv.x*8.+uTime*.55)*.5+.5;
 float height=(.006+pow(field,1.5)*.068)*uDepth*(.95+noise*.12+wave*.02);
 vec2 corners[6]=vec2[6](vec2(0,0),vec2(1,0),vec2(0,1),vec2(0,1),vec2(1,0),vec2(1,1));
 vec2 q=corners[gl_VertexID];vFace=q;
 vec2 p=uv+vec2((q.x-.5)*1.02/uGrid.x,-height+q.y*(height+1.05/uGrid.y));
 vColor=color;vHeight=field;vNoise=noise;vLight=clamp(.48+(left-right)*5.,.15,.95);
 gl_Position=vec4(p.x*2.-1.,1.-p.y*2.,-height*(1.-q.y)*8.,1.);
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
function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.bindVertexArray(gl.createVertexArray());
const uniforms=Object.fromEntries(['uImage','uGrid','uDepth','uTime','uSize'].map(n=>[n,gl.getUniformLocation(program,n)]));
const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
let source=null,stream=null,paused=false,dirty=true,clock=0,last=0,frames=0,lastUpload=0;const photo=new Image();photo.onload=()=>{source=photo;upload();$('state').textContent='Original photograph · processed locally'};
function upload(){if(!source)return;dirty=true;gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,source);gl.uniform2f(uniforms.uSize,source.videoWidth||source.naturalWidth,source.videoHeight||source.naturalHeight)}
function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio,1.5);const w=Math.round(r.width*d),h=Math.round(r.height*d);if(canvas.width!==w||canvas.height!==h){canvas.width=overlay.width=w;canvas.height=overlay.height=h;gl.viewport(0,0,w,h);dirty=true}}
new ResizeObserver(resize).observe(canvas);
function lines(time){const w=overlay.width,h=overlay.height;ctx.clearRect(0,0,w,h);ctx.lineWidth=.65;ctx.strokeStyle='#fff0dc88';ctx.fillStyle='#fff0dc';ctx.font=`${Math.max(9,w*.018)}px Arial`;const anchor={x:.56*w,y:(.39+Math.sin(time*.12)*.008)*h},points=[[.18,.23,'A4'],[.83,.34,'C5'],[.81,.68,'E5'],[.14,.73,''],[.4,.88,'']];for(let i=0;i<points.length;i++){const [u,v,label]=points[i],x=u*w,y=v*h;ctx.beginPath();ctx.moveTo(anchor.x,anchor.y);ctx.lineTo(x,y);ctx.stroke();const t=(time*.14+i*.17)%1;ctx.beginPath();ctx.arc(anchor.x+(x-anchor.x)*t,anchor.y+(y-anchor.y)*t,1.4,0,Math.PI*2);ctx.fill();if(label)ctx.fillText(label,x+6,y-5)}ctx.beginPath();ctx.arc(anchor.x,anchor.y,2.3,0,Math.PI*2);ctx.fill()}
function draw(time){requestAnimationFrame(draw);resize();if(!source||document.hidden||time-last<33||(paused&&!stream&&!dirty))return;dirty=false;const delta=Math.min(100,time-last);last=time;if(!paused)clock+=delta*.001;resize();if(stream&&time-lastUpload>66){upload();lastUpload=time}gl.clearColor(.09,.012,.009,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);const cols=+$('density').value,rows=Math.round(cols*.24);gl.uniform2f(uniforms.uGrid,cols,rows);gl.uniform1f(uniforms.uDepth,+$('depth').value/100);gl.uniform1f(uniforms.uTime,clock);gl.drawArraysInstanced(gl.TRIANGLES,0,6,cols*rows);lines(clock);frames++;window.reliefPreview={frames,strands:cols*rows,source:stream?'camera':'photo',clock,error:gl.getError()}}
$('depth').oninput=()=>{dirty=true;$('depth-out').textContent=`${$('depth').value}%`};$('density').oninput=()=>{dirty=true;$('density-out').textContent=$('density').value};
$('pause').onclick=()=>{paused=!paused;dirty=true;$('pause').textContent=paused?'Resume':'Pause'};
$('compare').onclick=()=>{const on=$('image').classList.toggle('compare');$('compare').setAttribute('aria-pressed',on);$('compare').textContent=on?'Processed':'Original'};
function stopCamera(){stream?.getTracks().forEach(t=>t.stop());stream=null;$('camera').textContent='Camera'}
$('camera').onclick=async()=>{if(stream){stopCamera();source=photo;upload();return}try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:640}},audio:false});$('feed').srcObject=stream;await $('feed').play();source=$('feed');upload();$('image').classList.remove('compare');$('compare').setAttribute('aria-pressed','false');$('state').textContent='Live camera · processed locally';$('camera').textContent='Back to photo'}catch(e){stopCamera();$('state').textContent=`Camera unavailable: ${e.message}`}};
$('upload').onchange=()=>{const file=$('upload').files[0];if(!file)return;stopCamera();const url=URL.createObjectURL(file),image=new Image();image.onload=()=>{photo.src=url;source=image;$('original').src=url;upload();$('state').textContent='Your image · processed locally'};image.src=url};
window.addEventListener('pagehide',stopCamera);document.addEventListener('visibilitychange',()=>{if(document.hidden&&stream){stopCamera();source=photo;upload()}});requestAnimationFrame(draw);
