import {scales} from './music.js';
// A repeating four-bar song, reshaped by motion rather than random note selection.
export function arrangementStep(step,{scale='major',energy=.3,y=.5}={}){
 const s=scales[scale]||scales.major,bar=Math.floor(step/16)%4,i=step%16;
 const degree=[0,5,3,4][bar],note=d=>45+s[((d%s.length)+s.length)%s.length]+12*Math.floor(d/s.length),root=note(degree);
 const events=[];const tone=(midi,level,duration,kind)=>events.push({type:'tone',midi,level,duration,kind});
 if(i===0){for(const d of [degree,degree+2,degree+4,degree+6])tone(note(d)+12,.055,2.8,'pad');tone(root-12,.16,.55,'bass')}
 if(i===8)tone(root-12,.12,.4,'bass');
 if([0,6,8].includes(i))events.push({type:'percussion',kind:'kick',level:.18,freq:65});
 if(i===4||i===12)events.push({type:'percussion',kind:'snare',level:.10,freq:180});
 if(i%2===0||(energy>.6&&[7,15].includes(i)))events.push({type:'percussion',kind:'hat',level:i%4===2?.045:.025,freq:6000});
 // A stable call-and-response motif; register follows the performer's screen position.
 const slots=[2,5,10,14],motif=[[0,2,4,2],[0,4,2,1],[2,4,6,4],[4,2,1,0]],slot=slots.indexOf(i);
 if(slot>=0){const octave=y<.4?24:12;tone(note(degree+motif[bar][slot])+octave,.075+energy*.055,.65,'bell')}
 return events;
}
