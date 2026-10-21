// Retain played note positions for loop highlights; OpenCV owns movement detection.
export class VisualLoop{
 constructor(){this.reset()}
 reset(){this.looping=false;this.points=new Map()}
 movement(replace=false){if(this.looping&&replace)this.points.clear();this.looping=false}
 remember(point){this.points.delete(point.id);this.points.set(point.id,{...point,box:point.box?{...point.box}:undefined});while(this.points.size>6)this.points.delete(this.points.keys().next().value)}
}
