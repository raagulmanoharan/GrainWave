// Render the opening serif type on a low-resolution grid, as in the poster reference.
export async function pixelPosterType(){
 await document.fonts.ready;
 const targets=[...document.querySelectorAll('.relief-name,.landing-tagline em')];
 const paint=()=>targets.forEach(el=>{
  let canvas=el.querySelector('canvas');
  if(!canvas){canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');el.append(canvas)}
  const style=getComputedStyle(el),rect=el.getBoundingClientRect(),step=el.classList.contains('relief-name')?3:1.5;
  if(rect.width<1||rect.height<1)return;
  canvas.width=Math.ceil(rect.width/step);canvas.height=Math.ceil(rect.height/step);
  const ctx=canvas.getContext('2d');ctx.scale(1/step,1/step);
  ctx.font=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  ctx.fillStyle='#090909';ctx.textBaseline='alphabetic';
  const text=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('');
  const metrics=ctx.measureText(text),size=parseFloat(style.fontSize),line=parseFloat(style.lineHeight);
  const ascent=metrics.fontBoundingBoxAscent??size*.8,descent=metrics.fontBoundingBoxDescent??size*.2;
  ctx.letterSpacing=style.letterSpacing;
  ctx.fillText(text,parseFloat(style.paddingLeft),(line-ascent-descent)/2+ascent+parseFloat(style.paddingTop));
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
  for(let i=3;i<pixels.data.length;i+=4)pixels.data[i]=pixels.data[i]>96?255:0;
  ctx.putImageData(pixels,0,0);
 });
 paint();new ResizeObserver(paint).observe(document.querySelector('.visual-instruction'));
}
