export const palette=[57,60,62,64,67,69];
export function pulsePitch(y){return palette[Math.min(palette.length-1,Math.floor(Math.max(0,Math.min(1,1-y))*palette.length))]}
// Two bars of syncopation with a fixed, small A-minor pentatonic motif.
export function arrangementStep(step,{energy=.3}={}){
 const i=step%16,bar=Math.floor(step/16)%2,events=[];
 const hit=(kind,level,freq)=>events.push({type:'percussion',kind,level,freq});
 if([0,6,10].includes(i)||(bar===1&&i===14))hit('kick',.21,55);
 if(i===4||i===12)hit('snare',.16,180);
 if(i%2===0||(energy>.55&&[3,11,15].includes(i)))hit('hat',i%4===2?.055:.035,6000);
 if((bar===0&&i===11)||(bar===1&&i===7))hit('snare',.045,180);
 if(i===0||i===8)events.push({type:'tone',kind:'bass',midi:bar===0?45:40,level:.13,duration:.12});
 const slots=[2,7,10,14],index=slots.indexOf(i),motif=bar===0?[0,2,4,2]:[0,3,2,1];
 if(index>=0)events.push({type:'tone',kind:'pulse',midi:palette[motif[index]],level:.09+energy*.06,duration:.11});
 return events;
}
