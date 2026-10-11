const pcs=[0,3,5,7,10];
const pitchClass=m=>((m-57)%12+12)%12;
// A distinct upper register, quantized to the same A-minor pentatonic collection.
export function complementaryPitch(midi,locked,time,origin,duration,previous=null){
 if(!locked?.length)return midi;
 const highest=Math.max(...locked.map(n=>n.midi));
 const phase=((time-origin)%duration+duration)%duration;
 const sounding=locked.filter(n=>((phase-n.offset+duration)%duration)<1800).map(n=>n.midi);
 const candidates=[];for(let p=Math.min(96,highest+2);p<=Math.min(108,highest+14);p++)if(pcs.includes(pitchClass(p)))candidates.push(p);
 const different=candidates.filter(p=>!sounding.some(n=>pitchClass(n)===pitchClass(p)));
 const choices=different.length?different:candidates;
 const target=midi+12;
 const score=p=>Math.abs(p-target)*.3+(previous===null?0:Math.abs(p-previous)*.3+(p===previous?2:0))+sounding.reduce((s,n)=>s+([1,2,6,10,11].includes(Math.abs(p-n)%12)?5:0),0);
 return choices.reduce((best,p)=>score(p)<score(best)?p:best,choices[0]);
}
