// Decorative opening paths, independent of motion tracking and audio events.
export function drawPosterPaths(ctx,w,h,time,reduced=false){
 const t=reduced?0:time/1000;
 const paths=[[[.01,.07],[.2,.2],[.69,.29],[.96,.46]],[[.94,.06],[.88,.25],[.94,.54],[.36,.75],[.04,.91]],[[.01,.45],[.11,.65],[.45,.8],[.89,.86],[.97,.94]],[[.92,.31],[.64,.12],[.29,.1],[.1,.23]]];
 const curve=(p,i)=>{const a=p[i],b=p[i+1],before=p[Math.max(0,i-1)],after=p[Math.min(p.length-1,i+2)];return {a,b,c:{x:a.x+(b.x-before.x)/6,y:a.y+(b.y-before.y)/6},d:{x:b.x-(after.x-a.x)/6,y:b.y-(after.y-a.y)/6}}};
 ctx.save();ctx.shadowBlur=0;ctx.setLineDash([]);
 paths.forEach((path,k)=>{
  const points=path.map(([x,y],i)=>({x:(x+Math.sin(t*.17+k*1.7+i)*.013)*w,y:(y+Math.cos(t*.13+k+i*1.3)*.012)*h}));
  ctx.lineWidth=k<3?1.5:.8;ctx.strokeStyle=`rgba(255,255,255,${k<3?.86:.35})`;
  ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
  for(let i=0;i<points.length-1;i++){const {b,c,d}=curve(points,i);ctx.bezierCurveTo(c.x,c.y,d.x,d.y,b.x,b.y)}ctx.stroke();
  points.forEach(p=>{ctx.fillStyle=k<3?'#ffffff':'#ffffff77';ctx.fillRect(p.x-2,p.y-2,4,4)});
  const progress=((t*.07+k*.23)%1)*(points.length-1),segment=Math.min(points.length-2,Math.floor(progress)),u=progress-segment,{a,b,c,d}=curve(points,segment);
  const x=(1-u)**3*a.x+3*(1-u)**2*u*c.x+3*(1-u)*u*u*d.x+u**3*b.x,y=(1-u)**3*a.y+3*(1-u)**2*u*c.y+3*(1-u)*u*u*d.y+u**3*b.y;ctx.fillStyle='#ffffff';ctx.fillRect(x-2,y-2,4,4);
 });
 ctx.restore();
}
