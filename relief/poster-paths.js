// Decorative opening paths, independent of motion tracking and audio events.
export function drawPosterPaths(ctx,w,h,time,reduced=false){
 const t=reduced?0:time/1000;
 const paths=[[[.1,.09],[.18,.2],[.64,.26],[.92,.43]],[[.88,.11],[.64,.16],[.79,.34],[.13,.56]],[[.06,.89],[.31,.74],[.84,.77],[.93,.93]],[[.94,.58],[.76,.69],[.21,.86],[.08,.98]]];
 ctx.save();ctx.lineWidth=.65;ctx.shadowBlur=0;ctx.setLineDash([]);
 paths.forEach((path,k)=>{
  const points=path.map(([x,y],i)=>({x:(x+Math.sin(t*.17+k*1.7+i)*.018)*w,y:(y+Math.cos(t*.13+k+i*1.3)*.016)*h}));
  ctx.strokeStyle=`rgba(255,255,255,${.38+k*.035})`;
  ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
  for(let i=1;i<points.length;i++){const prev=points[i-1],p=points[i];ctx.quadraticCurveTo(prev.x+(p.x-prev.x)*.3,prev.y+(p.y-prev.y)*.75,p.x,p.y)}ctx.stroke();
  points.forEach((p,i)=>{ctx.fillStyle=`rgba(255,255,255,${.65+Math.sin(t*.7+k+i)*.1})`;ctx.fillRect(p.x-1.5,p.y-1.5,3,3)});
  const progress=((t*.08+k*.23)%1)*(points.length-1),segment=Math.min(points.length-2,Math.floor(progress)),u=progress-segment,a=points[segment],b=points[segment+1],cx=a.x+(b.x-a.x)*.3,cy=a.y+(b.y-a.y)*.75;const x=(1-u)**2*a.x+2*(1-u)*u*cx+u*u*b.x,y=(1-u)**2*a.y+2*(1-u)*u*cy+u*u*b.y;ctx.fillStyle='#ffffff';ctx.fillRect(x-1.5,y-1.5,3,3);
 });
 ctx.restore();
}
