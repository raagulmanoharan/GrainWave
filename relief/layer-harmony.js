const pcs=[0,3,5,7,10];
const pitchClass=m=>((m-57)%12+12)%12;
// Stay near the gesture's natural pitch. Avoid unisons, not entire registers.
export function complementaryPitch(midi,locked,time,origin,duration,previous=null){
 if(!locked?.length)return midi;
 const phase=((time-origin)%duration+duration)%duration;
 const sounding=locked.filter(n=>((phase-n.offset+duration)%duration)<1800).map(n=>n.midi);
 const candidates=[];for(let p=Math.max(45,midi-7);p<=Math.min(84,midi+7);p++)if(pcs.includes(pitchClass(p)))candidates.push(p);
 if(!candidates.length)return midi;
 const distinct=candidates.filter(p=>p!==previous&&!sounding.includes(p));
 const choices=distinct.length?distinct:candidates.filter(p=>!sounding.includes(p));
 const score=p=>Math.abs(p-midi)+(previous===null?0:Math.abs(p-previous)*.12)+(p===previous?4:0)+sounding.reduce((s,n)=>s+([1,2,6,10,11].includes(Math.abs(p-n)%12)?2:0),0);
 return (choices.length?choices:candidates).reduce((best,p)=>score(p)<score(best)?p:best,(choices.length?choices:candidates)[0]);
}
