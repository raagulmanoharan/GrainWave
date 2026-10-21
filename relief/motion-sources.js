// OpenCV regions already require persistent, coherent flow after camera alignment.
function sameRegion(a,b){
 if(!a||!b)return false;
 const area=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
 return area/Math.max(1e-9,Math.min(a.w*a.h,b.w*b.h))>.35;
}
export function mergeMotionSources(objects,regions,recognized=[],{uncertain=false,maximum=10}={}){
 if(uncertain)return [];
 const output=objects.slice(0,maximum);
 for(const region of regions){
  if(output.length>=maximum)break;
  if(!region.confirmed||!region.box||!Number.isFinite(region.x+region.y+region.dx+region.dy))continue;
  // A recognized object's box owns its movement, even before its music gate opens.
  if(recognized.some(o=>sameRegion(o.box,region.box)))continue;
  if(output.some(o=>sameRegion(o.box,region.box)))continue;
  output.push({...region,label:'motion'});
 }
 return output;
}
