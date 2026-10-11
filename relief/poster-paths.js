// Opening connections share the live tracker’s straight-line, square-marker language.
// These ambient markers are decorative; only camera motion drives musical events.
export function drawPosterPaths(ctx,w,h,time,reduced=false){
 const t=reduced?0:time/1000;
 const points=[[.07,.14],[.76,.13],[.92,.31],[.63,.48],[.12,.58],[.36,.72],[.88,.79],[.67,.92],[.05,.88]].map(([x,y],i)=>({x:(x+Math.sin(t*.19+i)*.008)*w,y:(y+Math.cos(t*.16+i)*.008)*h}));
 const edges=[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[1,3],[3,6],[4,8],[5,7]];
 ctx.save();ctx.shadowBlur=0;ctx.setLineDash([]);ctx.lineWidth=1;ctx.strokeStyle='#ffffffe0';
 edges.forEach(([a,b],i)=>{ctx.setLineDash(i%3===1?[1,5]:[]);ctx.beginPath();ctx.moveTo(points[a].x,points[a].y);ctx.lineTo(points[b].x,points[b].y);ctx.stroke()});
 ctx.setLineDash([]);
 points.forEach((p,i)=>{const size=i%3===0?18:10;ctx.strokeRect(p.x-size/2,p.y-size/2,size,size);if(i===Math.floor(t*.3)%points.length){ctx.fillStyle='#ffffff';ctx.fillRect(p.x-3,p.y-3,6,6)}});
 ctx.restore();
}
